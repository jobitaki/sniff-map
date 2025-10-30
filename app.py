from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    'postgresql://username:password@localhost/sniff_pittsburgh'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Simple Air Quality Data Model
class AirQualityReading(db.Model):
    __tablename__ = 'air_quality_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Air quality measurements
    pm2_5 = db.Column(db.Float)  # PM2.5 (µg/m³)
    pm10 = db.Column(db.Float)   # PM10 (µg/m³)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Reading {self.device_id}: PM2.5={self.pm2_5}, PM10={self.pm10} at {self.timestamp}>'

def print_all_data():
    """Print all data points in the database"""
    print("\n" + "="*60)
    print("📊 ALL AIR QUALITY DATA POINTS")
    print("="*60)
    
    readings = AirQualityReading.query.order_by(AirQualityReading.timestamp.desc()).all()
    
    if not readings:
        print("No data points in database yet.")
        return
    
    for i, reading in enumerate(readings, 1):
        print(f"{i:2d}. Device: {reading.device_id}")
        print(f"    Location: ({reading.latitude:.4f}, {reading.longitude:.4f})")
        print(f"    PM2.5: {reading.pm2_5} µg/m³, PM10: {reading.pm10} µg/m³")
        print(f"    Time: {reading.timestamp}")
        print(f"    Added: {reading.created_at}")
        print()
    
    print(f"Total readings: {len(readings)}")
    print("="*60)

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
        
        # Extract device info - adjust these paths based on your actual TTS payload
        device_id = data.get('end_device_ids', {}).get('device_id', 'unknown_device')
        
        # Extract location - you might need to adjust this
        # For now, using default Pittsburgh coordinates
        latitude = 40.4406  # Default to Pittsburgh
        longitude = -79.9959
        
        # Try to get location from TTS if available
        uplink = data.get('uplink_message', {})
        locations = uplink.get('locations', {})
        if 'user' in locations:
            latitude = locations['user'].get('latitude', latitude)
            longitude = locations['user'].get('longitude', longitude)
        
        # Extract timestamp
        timestamp_str = data.get('received_at')
        if timestamp_str:
            # Parse TTS timestamp (usually ISO format)
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            timestamp = datetime.utcnow()
        
        # Extract measurements from payload
        # You'll need to decode the frm_payload based on your sensor format
        frm_payload = uplink.get('frm_payload', '')
        
        # For now, using dummy values - replace with actual payload decoding
        pm2_5 = 25.0  # Replace with actual decoding from frm_payload
        pm10 = 45.0   # Replace with actual decoding from frm_payload
        
        print(f"📡 Processing data from device: {device_id}")
        print(f"   Location: ({latitude}, {longitude})")
        print(f"   Timestamp: {timestamp}")
        print(f"   Payload: {frm_payload}")
        
        # Create and save new reading
        reading = AirQualityReading(
            device_id=device_id,
            latitude=latitude,
            longitude=longitude,
            timestamp=timestamp,
            pm2_5=pm2_5,
            pm10=pm10
        )
        
        db.session.add(reading)
        db.session.commit()
        
        print(f"✅ Data saved to database!")
        
        # Print all data points after new addition
        print_all_data()
        
        return jsonify({'status': 'success', 'message': 'Data received and stored'}), 200
        
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
    readings = AirQualityReading.query.order_by(AirQualityReading.timestamp.desc()).all()
    
    data = []
    for reading in readings:
        data.append({
            'id': reading.id,
            'device_id': reading.device_id,
            'latitude': reading.latitude,
            'longitude': reading.longitude,
            'timestamp': reading.timestamp.isoformat(),
            'pm2_5': reading.pm2_5,
            'pm10': reading.pm10,
            'created_at': reading.created_at.isoformat()
        })
    
    return jsonify({'data': data, 'count': len(data)})

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        print("🚀 Sniff Pittsburgh - Minimal TTS Data Collector")
        print("="*50)
        print("Ready to receive TTS webhooks at: /tts-webhook")
        print("Health check available at: /health")
        print("View data at: /data")
        print("="*50)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000)