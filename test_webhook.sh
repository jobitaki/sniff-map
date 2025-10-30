#!/bin/bash

# Test script for Sniff Pittsburgh TTS webhook

echo "🧪 Testing Sniff Pittsburgh TTS Webhook"
echo "======================================="

# Check if app is running
if ! curl -f http://localhost:5001/health &> /dev/null; then
    echo "❌ Flask app is not running. Please start it first:"
    echo "   docker compose up -d"
    exit 1
fi

echo "✅ Flask app is running"

# Send test TTS webhook data
echo "📡 Sending test TTS webhook data..."

TEST_DATA='{
  "end_device_ids": {
    "device_id": "test_sensor_001"
  },
  "received_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "uplink_message": {
    "frm_payload": "test_payload_data",
    "locations": {
      "user": {
        "latitude": 40.4406,
        "longitude": -79.9959
      }
    }
  }
}'

# Send the webhook
RESPONSE=$(curl -s -X POST http://localhost:5001/tts-webhook \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

echo "📨 Response: $RESPONSE"

# Check if data was saved
echo "🔍 Checking saved data..."
sleep 1

DATA_RESPONSE=$(curl -s http://localhost:5001/data)
echo "💾 Database contents:"
echo "$DATA_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DATA_RESPONSE"

echo ""
echo "✅ Test complete!"
echo "Check the app logs with: docker compose logs -f app"