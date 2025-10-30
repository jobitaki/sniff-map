# Sniff Pittsburgh Backend

A Flask-based backend for collecting and serving air quality data from LoRaWAN sensors.

## Features

- 🌍 **PostgreSQL Database** for storing air quality readings
- 📡 **LoRaWAN Integration** with TTS (The Things Stack) support
- 🗺️ **Geospatial Queries** for location-based data retrieval
- 📊 **RESTful API** for frontend integration
- 🔒 **CORS Support** for web application access

## Air Quality Measurements

The system tracks the following environmental parameters:
- **PM1.0, PM2.5, PM10** - Particulate matter (µg/m³)
- **NOx** - Nitrogen oxides (ppb)
- **CO2** - Carbon dioxide (ppm)

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up PostgreSQL

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb sniff_pittsburgh

# Or run the setup script
sudo -u postgres psql < database_setup.sql
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### 4. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Data Upload (for LoRaWAN servers)

```http
POST /api/data/upload
Content-Type: application/json

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
```

### Get Latest Data (for frontend)

```http
GET /api/data/latest?hours=24&limit=100
```

### Get Data by Location

```http
GET /api/data/by-location?min_lat=40.4&max_lat=40.5&min_lng=-80.0&max_lng=-79.9
```

### Get Active Devices

```http
GET /api/devices
```

## LoRaWAN Integration

### The Things Stack (TTS) Setup

1. **Configure Webhook** in your TTS application:
   - **Webhook ID**: `sniff-pittsburgh-webhook`
   - **Base URL**: `https://your-server.com/api/data/upload`
   - **Uplink Message**: ✅ Enabled

2. **Use the uploader script** for testing:
   ```bash
   python lorawan_uploader.py
   ```

3. **Customize payload decoding** in `lorawan_uploader.py` to match your sensor format

## Database Schema

```sql
CREATE TABLE air_quality_readings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    pm1_0 FLOAT,    -- PM1.0 (µg/m³)
    pm2_5 FLOAT,    -- PM2.5 (µg/m³)
    pm10 FLOAT,     -- PM10 (µg/m³)
    nox FLOAT,      -- NOx (ppb)
    co2 FLOAT,      -- CO2 (ppm)
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Integration

Update your JavaScript to fetch real data:

```javascript
// Replace static data with API call
async function loadAirQualityData() {
    try {
        const response = await fetch('/api/data/latest?hours=24');
        const data = await response.json();
        
        // Process data.data array for your map
        data.data.forEach(reading => {
            // Calculate AQI from PM2.5 or use your preferred measurement
            const aqi = calculateAQI(reading.pm2_5);
            
            // Add marker to map
            addMarkerToMap(reading.latitude, reading.longitude, aqi);
        });
    } catch (error) {
        console.error('Error loading air quality data:', error);
    }
}
```

## Production Deployment

### Environment Variables

```bash
# Production settings
DATABASE_URL=postgresql://user:pass@hostname:port/database
SECRET_KEY=your-production-secret-key
FLASK_ENV=production
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample data
5. Submit a pull request

## License

MIT License - see LICENSE file for details