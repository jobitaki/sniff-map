from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    'postgresql://username:password@localhost/sniff_pittsburgh'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

db = SQLAlchemy(app)

# Air Quality Data Model
class AirQualityReading(db.Model):
    __tablename__ = 'air_quality_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), nullable=False)  # LoRaWAN device identifier
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Air quality measurements
    pm1_0 = db.Column(db.Float)  # PM1.0 (µg/m³)
    pm2_5 = db.Column(db.Float)  # PM2.5 (µg/m³)
    pm10 = db.Column(db.Float)   # PM10 (µg/m³)
    nox = db.Column(db.Float)    # NOx (ppb)
    co2 = db.Column(db.Float)    # CO2 (ppm)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'timestamp': self.timestamp.isoformat(),
            'pm1_0': self.pm1_0,
            'pm2_5': self.pm2_5,
            'pm10': self.pm10,
            'nox': self.nox,
            'co2': self.co2,
            'created_at': self.created_at.isoformat()
        }

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/data/upload', methods=['POST'])
def upload_data():
    """
    Endpoint for LoRaWAN server to upload air quality data
    Expected JSON format:
    {
        "device_id": "device_001",
        "latitude": 40.4406,
        "longitude": -79.9959,
        "timestamp": "2024-10-21T15:30:00Z",
        "measurements": {
            "pm1_0": 12.5,
            "pm2_5": 25.3,
            "pm10": 45.2,
            "nox": 15.7,
            "co2": 410.5
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['device_id', 'latitude', 'longitude', 'measurements']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Parse timestamp or use current time
        timestamp = datetime.utcnow()
        if 'timestamp' in data:
            try:
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid timestamp format'}), 400
        
        # Create new reading
        reading = AirQualityReading(
            device_id=data['device_id'],
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            timestamp=timestamp,
            pm1_0=data['measurements'].get('pm1_0'),
            pm2_5=data['measurements'].get('pm2_5'),
            pm10=data['measurements'].get('pm10'),
            nox=data['measurements'].get('nox'),
            co2=data['measurements'].get('co2')
        )
        
        db.session.add(reading)
        db.session.commit()
        
        return jsonify({
            'message': 'Data uploaded successfully',
            'id': reading.id,
            'timestamp': reading.timestamp.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/latest', methods=['GET'])
def get_latest_data():
    """
    Get latest air quality readings for the map
    Query parameters:
    - hours: number of hours to look back (default: 24)
    - limit: maximum number of readings (default: 100)
    """
    try:
        hours = request.args.get('hours', 24, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        # Calculate cutoff time
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Query recent readings
        readings = AirQualityReading.query.filter(
            AirQualityReading.timestamp >= cutoff_time
        ).order_by(AirQualityReading.timestamp.desc()).limit(limit).all()
        
        # Convert to list of dictionaries
        data = [reading.to_dict() for reading in readings]
        
        return jsonify({
            'data': data,
            'count': len(data),
            'hours_back': hours
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/by-location', methods=['GET'])
def get_data_by_location():
    """
    Get air quality data within a bounding box
    Query parameters:
    - min_lat, max_lat, min_lng, max_lng: bounding box coordinates
    - hours: number of hours to look back (default: 24)
    """
    try:
        # Get bounding box parameters
        min_lat = request.args.get('min_lat', type=float)
        max_lat = request.args.get('max_lat', type=float)
        min_lng = request.args.get('min_lng', type=float)
        max_lng = request.args.get('max_lng', type=float)
        hours = request.args.get('hours', 24, type=int)
        
        if not all([min_lat, max_lat, min_lng, max_lng]):
            return jsonify({'error': 'Missing bounding box coordinates'}), 400
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        readings = AirQualityReading.query.filter(
            AirQualityReading.latitude >= min_lat,
            AirQualityReading.latitude <= max_lat,
            AirQualityReading.longitude >= min_lng,
            AirQualityReading.longitude <= max_lng,
            AirQualityReading.timestamp >= cutoff_time
        ).order_by(AirQualityReading.timestamp.desc()).all()
        
        data = [reading.to_dict() for reading in readings]
        
        return jsonify({
            'data': data,
            'count': len(data),
            'bounding_box': {
                'min_lat': min_lat,
                'max_lat': max_lat,
                'min_lng': min_lng,
                'max_lng': max_lng
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Get list of active devices"""
    try:
        # Get unique devices from last 7 days
        cutoff_time = datetime.utcnow() - timedelta(days=7)
        
        devices = db.session.query(
            AirQualityReading.device_id,
            db.func.max(AirQualityReading.timestamp).label('last_seen'),
            db.func.count(AirQualityReading.id).label('reading_count')
        ).filter(
            AirQualityReading.timestamp >= cutoff_time
        ).group_by(AirQualityReading.device_id).all()
        
        device_list = []
        for device in devices:
            device_list.append({
                'device_id': device.device_id,
                'last_seen': device.last_seen.isoformat(),
                'reading_count': device.reading_count
            })
        
        return jsonify({
            'devices': device_list,
            'count': len(device_list)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Database initialization
@app.before_first_request
def create_tables():
    """Create database tables"""
    db.create_all()

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000)