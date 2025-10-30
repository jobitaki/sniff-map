#!/usr/bin/env python3
"""
LoRaWAN Data Uploader - Example script for TTS (The Things Stack) integration
This script shows how your LoRaWAN server can send data to your Flask backend.
"""

import requests
import json
from datetime import datetime
import random

# Configuration
API_BASE_URL = "http://localhost:5000/api"  # Change to your server URL
UPLOAD_ENDPOINT = f"{API_BASE_URL}/data/upload"

def create_sample_data():
    """Create sample air quality data for testing"""
    # Pittsburgh area coordinates
    base_lat = 40.4406
    base_lng = -79.9959
    
    # Add some random variation to simulate different sensor locations
    lat_offset = random.uniform(-0.05, 0.05)
    lng_offset = random.uniform(-0.05, 0.05)
    
    return {
        "device_id": f"device_{random.randint(1, 10):03d}",
        "latitude": base_lat + lat_offset,
        "longitude": base_lng + lng_offset,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "measurements": {
            "pm1_0": round(random.uniform(5.0, 25.0), 1),
            "pm2_5": round(random.uniform(10.0, 50.0), 1),
            "pm10": round(random.uniform(15.0, 75.0), 1),
            "nox": round(random.uniform(5.0, 40.0), 1),
            "co2": round(random.uniform(400.0, 500.0), 1)
        }
    }

def upload_data_to_api(data):
    """Upload air quality data to the Flask API"""
    try:
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(UPLOAD_ENDPOINT, 
                               json=data, 
                               headers=headers)
        
        if response.status_code == 201:
            print(f"✅ Successfully uploaded data for device {data['device_id']}")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Failed to upload data: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def tts_webhook_handler(tts_payload):
    """
    Example function to handle webhook data from The Things Stack
    Adapt this to match your TTS payload format
    """
    try:
        # Extract data from TTS payload
        # This is an example - adjust based on your actual TTS payload structure
        device_id = tts_payload.get('end_device_ids', {}).get('device_id')
        
        # Location data (if available from GPS or configured)
        location = tts_payload.get('uplink_message', {}).get('locations', {})
        if 'user' in location:
            latitude = location['user']['latitude']
            longitude = location['user']['longitude']
        else:
            # Use default Pittsburgh coordinates if no GPS
            latitude = 40.4406
            longitude = -79.9959
        
        # Decode payload (adjust based on your sensor data format)
        payload_raw = tts_payload.get('uplink_message', {}).get('frm_payload')
        # You'll need to decode this based on your sensor's data format
        
        # Example decoded measurements (replace with actual decoding logic)
        measurements = {
            "pm1_0": 15.2,  # Decode from payload_raw
            "pm2_5": 23.7,  # Decode from payload_raw
            "pm10": 35.1,   # Decode from payload_raw
            "nox": 18.5,    # Decode from payload_raw
            "co2": 420.3    # Decode from payload_raw
        }
        
        # Format for our API
        api_data = {
            "device_id": device_id,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": tts_payload.get('received_at'),
            "measurements": measurements
        }
        
        return upload_data_to_api(api_data)
        
    except Exception as e:
        print(f"❌ Error processing TTS payload: {e}")
        return False

if __name__ == "__main__":
    print("🌍 Sniff Pittsburgh - LoRaWAN Data Uploader")
    print("=" * 50)
    
    # Test with sample data
    print("\n📊 Generating sample data...")
    for i in range(5):
        sample_data = create_sample_data()
        print(f"\n📡 Uploading sample reading {i+1}/5...")
        upload_data_to_api(sample_data)
    
    print(f"\n✨ Test complete! Check your database or visit {API_BASE_URL}/data/latest")