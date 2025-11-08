import requests
import json
import time
import random

# Your webhook URL
WEBHOOK_URL = "http://localhost/tts-webhook"

# Pittsburgh center coordinates
PITTSBURGH_CENTER = (40.4406, -79.9959)

# 10 precomputed points around Pittsburgh for testing updates
PITTSBURGH_LOCATIONS = [
    (40.4406, -79.9959, "Downtown"),
    (40.4431, -79.9631, "Shadyside"),
    (40.4619, -79.9225, "East Liberty"),
    (40.4520, -80.0140, "North Shore"),
    (40.4300, -79.9800, "South Side"),
    (40.4850, -80.0020, "Lawrenceville"),
    (40.4100, -79.9200, "Squirrel Hill"),
    (40.4680, -79.9530, "Highland Park"),
    (40.4200, -80.0500, "West End"),
    (40.5000, -79.9400, "Bloomfield")
]

# AQI categories with PM2.5 ranges (µg/m³)
AQI_CATEGORIES = [
    (0, 12, "Good"),              # 0-12
    (12.1, 35.4, "Moderate"),     # 12.1-35.4
    (35.5, 55.4, "Unhealthy for Sensitive Groups"),  # 35.5-55.4
    (55.5, 150.4, "Unhealthy"),   # 55.5-150.4
    (150.5, 250.4, "Very Unhealthy"),  # 150.5-250.4
    (250.5, 500, "Hazardous")     # 250.5-500
]

def get_random_pm25():
    """Get a random PM2.5 value from any AQI category"""
    category = random.choice(AQI_CATEGORIES)
    return round(random.uniform(category[0], category[1]), 1)

def get_random_location_around_pittsburgh(radius_km=5):
    """Generate random coordinates within radius_km of Pittsburgh center"""
    # Convert km to degrees (approximate: 1 degree ≈ 111 km)
    radius_deg = radius_km / 111.0
    
    # Random angle and distance
    angle = random.uniform(0, 2 * 3.14159)
    distance = random.uniform(0, radius_deg)
    
    # Calculate new coordinates
    lat = PITTSBURGH_CENTER[0] + (distance * random.choice([-1, 1]) * abs(random.random()))
    lon = PITTSBURGH_CENTER[1] + (distance * random.choice([-1, 1]) * abs(random.random()))
    
    return round(lat, 4), round(lon, 4)

# Create a dummy TTS payload that matches your expected format
def create_dummy_payload(timestamp=None, lat=None, lon=None, pm25=None):
    """Create a dummy TTS webhook payload"""
    if timestamp is None:
        timestamp = int(time.time())
    
    if lat is None or lon is None:
        lat, lon = get_random_location_around_pittsburgh()
    
    if pm25 is None:
        pm25 = get_random_pm25()
    
    # Calculate other PM values proportionally
    pm1 = round(pm25 * 0.6, 1)
    pm10 = round(pm25 * 1.5, 1)
    
    # This mimics the actual JSON structure your sensor would send
    sensor_data = {
        "t": timestamp,           # Unix timestamp
        "la": lat,               # Latitude
        "lo": lon,               # Longitude
        "pm1": pm1,              # PM1.0
        "pm25": pm25,            # PM2.5
        "pm10": pm10,            # PM10
        "p0p3": random.randint(800, 2000),   # Particle count >0.3µm
        "p0p5": random.randint(500, 1200),   # Particle count >0.5µm
        "p1": random.randint(100, 400),      # Particle count >1.0µm
        "p2p5": random.randint(50, 150),     # Particle count >2.5µm
        "p5": random.randint(5, 30),         # Particle count >5.0µm
        "p10": random.randint(1, 10),        # Particle count >10µm
        "v": random.randint(50, 300),        # VOC index
        "n": random.randint(50, 250),        # NOx index
        "c": random.randint(400, 800),       # CO2 (ppm)
        "tmp": round(random.uniform(15, 30), 1),  # Temperature (°C)
        "rh": round(random.uniform(30, 80), 1),   # Relative Humidity (%)
        "src": 1                 # Data source (1 = sensor, 0 = manual)
    }
    
    # Convert to JSON string (as it would come from LoRaWAN)
    json_string = json.dumps(sensor_data, separators=(',', ':'))
    
    # Wrap it in the TTS webhook structure
    tts_payload = {
        "uplink_message": {
            "decoded_payload": {
                "text": json_string
            }
        }
    }
    
    return tts_payload

def send_dummy_data():
    """Send a dummy POST request to the webhook"""
    print("🚀 Sending dummy data to webhook...")
    print("=" * 60)
    
    payload = create_dummy_payload()
    
    print("📦 Payload:")
    print(json.dumps(payload, indent=2))
    print("=" * 60)
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"📝 Response Body: {response.json()}")
        
        if response.status_code == 200:
            print("\n🎉 Data successfully sent to database!")
        else:
            print("\n❌ Failed to send data")
            
    except Exception as e:
        print(f"\n❌ Error sending request: {e}")

def send_multiple_readings(count=5, interval=2):
    """Send multiple dummy readings with random locations and PM values"""
    print(f"📊 Sending {count} dummy readings with random locations...")
    
    for i in range(count):
        print(f"\n--- Reading {i+1}/{count} ---")
        
        # Create payload with random location and PM2.5
        timestamp = int(time.time()) - (i * 60)  # Each reading 1 minute apart
        lat, lon = get_random_location_around_pittsburgh(radius_km=8)
        pm25 = get_random_pm25()
        
        payload = create_dummy_payload(timestamp, lat, lon, pm25)
        
        sensor_data = json.loads(payload["uplink_message"]["decoded_payload"]["text"])
        print(f"📍 Location: ({lat}, {lon})")
        print(f"💨 PM2.5: {pm25} µg/m³")
        
        try:
            response = requests.post(
                WEBHOOK_URL,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                print(f"✅ Reading {i+1} sent successfully")
            else:
                print(f"❌ Reading {i+1} failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        if i < count - 1:
            time.sleep(interval)
    
    print("\n🎉 All readings sent!")

def send_precomputed_locations(interval=2):
    """Send data to 10 precomputed locations around Pittsburgh"""
    print(f"📍 Sending data to {len(PITTSBURGH_LOCATIONS)} precomputed locations...")
    print("This will test the update functionality as new data arrives at same locations\n")
    
    for i, (lat, lon, name) in enumerate(PITTSBURGH_LOCATIONS):
        print(f"\n--- Location {i+1}/{len(PITTSBURGH_LOCATIONS)}: {name} ---")
        
        timestamp = int(time.time())
        pm25 = get_random_pm25()
        
        payload = create_dummy_payload(timestamp, lat, lon, pm25)
        
        sensor_data = json.loads(payload["uplink_message"]["decoded_payload"]["text"])
        print(f"📍 Coordinates: ({lat}, {lon})")
        print(f"💨 PM2.5: {pm25} µg/m³")
        
        # Determine AQI category
        for min_val, max_val, category in AQI_CATEGORIES:
            if min_val <= pm25 <= max_val:
                print(f"🎨 AQI Category: {category}")
                break
        
        try:
            response = requests.post(
                WEBHOOK_URL,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                print(f"✅ {name} data sent successfully")
            else:
                print(f"❌ {name} failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        if i < len(PITTSBURGH_LOCATIONS) - 1:
            time.sleep(interval)
    
    print("\n🎉 All precomputed locations populated!")
    print("\n💡 Tip: Run this command again to update all locations with new PM values")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "multiple":
            # Send multiple readings with random locations
            count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            send_multiple_readings(count)
        elif sys.argv[1] == "locations":
            # Send data to 10 precomputed locations
            send_precomputed_locations(interval=1)
        else:
            print("Usage:")
            print("  python test_webhook.py              - Send single random reading")
            print("  python test_webhook.py multiple [N] - Send N random readings (default 5)")
            print("  python test_webhook.py locations    - Send to 10 precomputed Pittsburgh locations")
    else:
        # Send single reading with random location and PM value
        send_dummy_data()