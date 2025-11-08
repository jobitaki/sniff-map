from flask import Flask, json, request, jsonify, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import time
from dotenv import load_dotenv
import re
from math import radians, cos, sin, asin, sqrt
import threading

# Load environment variables
load_dotenv()

# Configure Flask to find templates and static files
app = Flask(__name__, static_folder='.', template_folder='.')

# Database configuration - match your docker-compose.yml
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    'postgresql://postgres:postgres123@db:5432/sniff_db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    
    return c * r

def find_nearby_reading(lat, lon, radius_meters=50):
    """
    Find an existing reading within radius_meters of the given coordinates
    Returns the nearest reading if found within radius, otherwise None
    """
    try:
        # Get recent readings (last 24 hours) to avoid checking old data
        recent_time = int(time.time()) - (24 * 60 * 60)
        readings = AirQualityReading.query.filter(
            AirQualityReading.t >= recent_time
        ).all()
        
        nearest_reading = None
        min_distance = float('inf')
        
        for reading in readings:
            distance = haversine_distance(lat, lon, reading.la, reading.lo)
            if distance < radius_meters and distance < min_distance:
                min_distance = distance
                nearest_reading = reading
        
        return nearest_reading
    except Exception as e:
        print(f"Error finding nearby reading: {e}")
        return None

def cleanup_old_data(days_to_keep=30):
    """Remove database entries older than specified days"""
    try:
        with app.app_context():
            cutoff_time = int(time.time()) - (days_to_keep * 24 * 60 * 60)
            
            # Delete old readings
            deleted = AirQualityReading.query.filter(
                AirQualityReading.t < cutoff_time
            ).delete()
            
            db.session.commit()
            
            if deleted > 0:
                print(f"🗑️  Cleaned up {deleted} readings older than {days_to_keep} days")
            
            return deleted
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return 0

def periodic_cleanup(interval_hours=24, days_to_keep=30):
    """Run cleanup task periodically"""
    while True:
        try:
            time.sleep(interval_hours * 60 * 60)  # Wait for interval
            print(f"\n🧹 Running periodic cleanup (keeping last {days_to_keep} days)...")
            cleanup_old_data(days_to_keep)
        except Exception as e:
            print(f"❌ Error in periodic cleanup: {e}")

def start_cleanup_thread(interval_hours=24, days_to_keep=30):
    """Start background thread for periodic cleanup"""
    cleanup_thread = threading.Thread(
        target=periodic_cleanup,
        args=(interval_hours, days_to_keep),
        daemon=True
    )
    cleanup_thread.start()
    print(f"🧹 Started cleanup thread (runs every {interval_hours}h, keeps {days_to_keep} days)")

def wait_for_db(max_retries=30, delay=2):
    """Wait for database to be available and create tables"""
    for attempt in range(max_retries):
        try:
            with app.app_context():
                # Try to connect to the database
                db.session.execute(db.text('SELECT 1'))
                db.session.commit()
                print("✅ Database connection successful!")
                
                # Create all tables
                print("📋 Creating database tables...")
                db.create_all()
                print("✅ Tables created successfully!")
                
                # Run initial cleanup
                print("🧹 Running initial cleanup...")
                cleanup_old_data(days_to_keep=30)
                
                return True
        except Exception as e:
            print(f"⏳ Waiting for database... (attempt {attempt + 1}/{max_retries})")
            print(f"   Error: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                print("❌ Failed to connect to database after all retries")
                return False
    return False

# Simple Air Quality Data Model
class AirQualityReading(db.Model):
    __tablename__ = 'air_quality_readings'

    '''
    {
        "t": xxx
        "la": xxx,
        "lo": xxx,
        "pm1": xxx,
        "pm25": xxx,
        "pm10": xxx,
        "p0p3": xxx,
        "p0p5": xxx,
        "p1": xxx,
        "p2p5": xxx,
        "p5": xxx,
        "p10": xxx,
        "v": xxx,
        "n": xxx,
        "c": xxx,
        "tmp": xxx,
        "rh": xxx,
        "src": xxx
    }
    '''
    
    # id = db.Column(db.Integer, primary_key=True)
    # device_id = db.Column(db.String(50), nullable=False)
    # latitude = db.Column(db.Float, nullable=False)
    # longitude = db.Column(db.Float, nullable=False)
    # timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    t = db.Column('t', db.Integer, primary_key=True)  # Timestamp used as ID
    la = db.Column('la', db.Float)  # Latitude
    lo = db.Column('lo', db.Float) # Longitude
    pm1 = db.Column('pm1', db.Float)      # PM1.0 (µg/m³)
    pm25 = db.Column('pm25', db.Float)   # PM2.5 (µg/m³)
    pm10 = db.Column('pm10', db.Float)    # PM10 (µg/m³)
    p0p3 = db.Column('p0p3', db.Float)    # Particle count >0.3µm
    p0p5 = db.Column('p0p5', db.Float)    # Particle count >0.5µm
    p1 = db.Column('p1', db.Float)        # Particle count >1.0µm
    p2p5 = db.Column('p2p5', db.Float)    # Particle count >2.5µm
    p5 = db.Column('p5', db.Float)        # Particle count >5.0µm
    p10 = db.Column('p10', db.Float)      # Particle count >10µm
    v = db.Column('v', db.Float)          # VOC index
    n = db.Column('n', db.Float)          # NOx index
    c = db.Column('c', db.Float)          # CO2 (ppm)
    tmp = db.Column('tmp', db.Float)     # Temperature (°C)
    rh = db.Column('rh', db.Float)        # Relative Humidity (%)
    src = db.Column('src', db.Integer)    # Data source

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Reading {self.t}: PM2.5={self.pm25}, PM10={self.pm10}>'

def print_all_data():
    """Print all data points in the database"""
    print("\n" + "="*60)
    print("📊 ALL AIR QUALITY DATA POINTS")
    print("="*60)
    
    readings = AirQualityReading.query.order_by(AirQualityReading.t.desc()).all()
    
    if not readings:
        print("No data points in database yet.")
        return
    
    # for i, reading in enumerate(readings, 1):
    #     print(f"{i:2d}. Device: {reading.device_id}")
    #     print(f"    Location: ({reading.la:.4f}, {reading.lo:.4f})")
    #     print(f"    PM2.5: {reading.pm25} µg/m³, PM10: {reading.pm10} µg/m³")
    #     print(f"    Time: {reading.t}")
    #     print(f"    Added: {reading.created_at}")
    #     print()
    
    print(f"Total readings: {len(readings)}")
    print("="*60)

# Website routes
@app.route('/')
def index():
    """Serve the main map page"""
    return render_template('index.html')

@app.route('/about.html')
def about_html():
    """Route for about.html"""
    return render_template('about.html')

@app.route('/contact.html')
def contact_html():
    """Route for contact.html"""
    return render_template('contact.html')

@app.route('/sniff_logo.png')
def logo():
    """Serve the logo image"""
    return send_from_directory('.', 'sniff_logo.png')

@app.route('/style.css')
def serve_css():
    return send_from_directory('.', 'style.css', mimetype='text/css')

@app.route('/map.js')
def serve_js():
    return send_from_directory('.', 'map.js', mimetype='application/javascript')

@app.route('/api/data/latest', methods=['GET'])
def get_latest_data():
    """Get latest air quality data for the map"""
    readings = AirQualityReading.query.order_by(AirQualityReading.t.desc()).limit(50).all()
    
    data = []
    for reading in readings:
        # Calculate data age in hours
        age = (time.time() - reading.t) / 3600

        if reading.la == -1 or reading.lo == -1:
            continue  # Skip invalid locations
        
        data.append({
            't': reading.t,
            'la': reading.la,
            'lo': reading.lo,
            'pm1': reading.pm1,
            'pm25': reading.pm25,
            'pm10': reading.pm10,
            'p0p3': reading.p0p3,
            'p0p5': reading.p0p5,
            'p1': reading.p1,
            'p2p5': reading.p2p5,
            'p5': reading.p5,
            'p10': reading.p10,
            'v': reading.v,
            'n': reading.n,
            'c': reading.c,
            'tmp': reading.tmp,
            'rh': reading.rh,
            'src': reading.src,
            'age_hours': age,
        })
    
    return jsonify({'data': data, 'count': len(data)})

collecting_data = False

@app.route('/tts-webhook', methods=['POST'])
def handle_tts_webhook():
    """
    Handle TTS downlink webhook
    Expected TTS payload structure (you may need to adjust based on your actual TTS format)
    """
    try:
        data = request.get_json()
        print(f"\n🔄 Received TTS webhook: {datetime.now()}")
        print(f"Raw payload: {data}")

        raw_text = data["uplink_message"]["decoded_payload"].get('text')

        cleaned_text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', raw_text)  # Remove control chars
        cleaned_text = cleaned_text.replace(' ', '')

        print(cleaned_text)

        json_data = json.loads(cleaned_text)

        print(f"Parsed JSON data: {json_data}")

        lat = json_data.get('la')
        lon = json_data.get('lo')
        
        # Check if there's a nearby reading within configured radius
        MERGE_RADIUS_METERS = 50  # Adjust this value as needed
        nearby_reading = find_nearby_reading(lat, lon, MERGE_RADIUS_METERS)
        
        if nearby_reading:
            # Update existing nearby reading
            print(f"📍 Found nearby reading within {MERGE_RADIUS_METERS}m - updating existing entry")
            
            for key, value in json_data.items():
                setattr(nearby_reading, key, value)
            
            nearby_reading.created_at = datetime.utcnow()
            db.session.commit()
            
            print(f"✅ Updated existing entry: PM2.5={nearby_reading.pm25}, Location=({nearby_reading.la}, {nearby_reading.lo})")
            print_all_data()
            
            return jsonify({'status': 'data_updated', 'action': 'merge_nearby'}), 200
        
        # check if database entry already exists by timestamp
        existing_entry = AirQualityReading.query.filter_by(t=json_data.get('t')).first()
        if existing_entry:
            # update existing entry by timestamp

            for key, value in json_data.items():
                setattr(existing_entry, key, value)

            db.session.commit()
            print(f"✅ Existing timestamp entry updated in database")

            # Print all data points after update
            print_all_data()

            return jsonify({'status': 'data_updated', 'action': 'update_timestamp'}), 200
        
        # Create dummy reading
        reading = AirQualityReading(
            t=json_data.get('t'),
            la=-1,
            lo=-1,
            pm1=-1,
            pm25=-1,
            pm10=-1,
            p0p3=-1,
            p0p5=-1,
            p1=-1,
            p2p5=-1,
            p5=-1,
            p10=-1,
            v=-1,
            n=-1,
            c=-1,
            tmp=-1,
            rh=-1,
            src=-1
        )

        for key, value in json_data.items():
            setattr(reading, key, value)

        db.session.add(reading)
        db.session.commit()

        print(f"✅ New data point saved to database!")

        # Print all data points after new addition
        print_all_data()

        return jsonify({'status': 'data_received', 'action': 'create_new'}), 200
        
    except Exception as e:
        print(f"❌ Error processing TTS webhook: {e}")
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/data', methods=['GET'])
def get_all_data():
    """Get all data points as JSON"""
    readings = AirQualityReading.query.order_by(AirQualityReading.t.desc()).all()
    
    data = []
    # for reading in readings:
    #     data.append({
    #         'id': reading.id,
    #         'device_id': reading.device_id,
    #         'latitude': reading.latitude,
    #         'longitude': reading.longitude,
    #         'timestamp': reading.timestamp.isoformat(),
    #         'pm2_5': reading.pm2_5,
    #         'pm10': reading.pm10,
    #         'created_at': reading.created_at.isoformat()
    #     })
    
    return jsonify({'data': data, 'count': len(data)})

if __name__ == '__main__':
    print("🚀 Sniff Pittsburgh - Full Stack Air Quality Monitor")
    print("="*55)
    
    # Wait for database to be ready
    if not wait_for_db():
        print("❌ Could not connect to database. Exiting.")
        exit(1)
    
    # Start background cleanup thread
    # Runs every 24 hours, keeps data from last 30 days
    start_cleanup_thread(interval_hours=24, days_to_keep=30)
    
    print("🌐 Website available at:")
    print("   Main page: http://localhost/")
    print("   About page: http://localhost/about")
    print("")
    print("🔌 API endpoints:")
    print("   TTS webhook: http://localhost/tts-webhook")
    print("   Health check: http://localhost/health")
    print("   All data: http://localhost/data")
    print("   Latest data: http://localhost/api/data/latest")
    print("="*55)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=80)