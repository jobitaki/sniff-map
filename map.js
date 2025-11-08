// Initialize map centered on Pittsburgh
let map = L.map('map').setView([40.4406, -79.9959], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store markers for updates
let markers = {};

// Function to get color based on PM2.5 level (AQI standard)
function getColor(pm25) {
    if (pm25 === null || pm25 < 0) return '#808080'; // Gray for no data
    if (pm25 <= 12.0) return '#22c55e'; // Good (Green)
    if (pm25 <= 35.4) return '#84cc16'; // Moderate (Yellow)
    if (pm25 <= 55.4) return '#eab308'; // Unhealthy for Sensitive (Orange)
    if (pm25 <= 150.4) return '#f97316'; // Unhealthy (Red)
    if (pm25 <= 250.4) return '#ef4444'; // Very Unhealthy (Purple)
    return '#9333ea'; // Hazardous (Maroon)
}

// Function to get border color based on data age
function getBorderColor(ageHours) {
    if (ageHours < 1) return '#3b82f6'; // blue-500 - Fresh (<1h)
    if (ageHours < 6) return '#60a5fa'; // blue-400 - Recent (1-6h)
    if (ageHours < 24) return '#93c5fd'; // blue-300 - Older (6-24h)
    return '#d1d5db'; // gray-300 - Stale (>24h)
}

// Function to get AQI category
function getAQICategory(pm25) {
    if (pm25 === null || pm25 < 0) return 'No Data';
    if (pm25 <= 12.0) return 'Good';
    if (pm25 <= 35.4) return 'Moderate';
    if (pm25 <= 55.4) return 'Unhealthy for Sensitive Groups';
    if (pm25 <= 150.4) return 'Unhealthy';
    if (pm25 <= 250.4) return 'Very Unhealthy';
    return 'Hazardous';
}

// Format age display
function formatAge(ageHours) {
    if (ageHours < 1) return `${Math.round(ageHours * 60)} mins ago`;
    if (ageHours < 24) return `${Math.round(ageHours)} hours ago`;
    return `${Math.round(ageHours / 24)} days ago`;
}

// Function to create popup content
function createPopupContent(reading) {
    const timestamp = new Date(reading.t * 1000);
    const ageHours = reading.age_hours.toFixed(1);
    
    return `
        <div class="air-quality-popup">
            <h3>Air Quality Reading</h3>
            <div class="aqi-badge" style="background-color: ${getColor(reading.pm25)}">
                ${getAQICategory(reading.pm25)}
            </div>
            <table>
                <tr><td><strong>PM2.5:</strong></td><td>${reading.pm25?.toFixed(1) ?? 'N/A'} µg/m³</td></tr>
                <tr><td><strong>PM10:</strong></td><td>${reading.pm10?.toFixed(1) ?? 'N/A'} µg/m³</td></tr>
                <tr><td><strong>PM1.0:</strong></td><td>${reading.pm1?.toFixed(1) ?? 'N/A'} µg/m³</td></tr>
                <tr><td><strong>Temperature:</strong></td><td>${reading.tmp?.toFixed(1) ?? 'N/A'} °C</td></tr>
                <tr><td><strong>Humidity:</strong></td><td>${reading.rh?.toFixed(0) ?? 'N/A'}%</td></tr>
                <tr><td><strong>CO2:</strong></td><td>${reading.c?.toFixed(0) ?? 'N/A'} ppm</td></tr>
                <tr><td><strong>VOC Index:</strong></td><td>${reading.v?.toFixed(0) ?? 'N/A'}</td></tr>
                <tr><td><strong>NOx Index:</strong></td><td>${reading.n?.toFixed(0) ?? 'N/A'}</td></tr>
            </table>
            <div class="timestamp">
                <small>Measured: ${timestamp.toLocaleString()}</small><br>
                <small>Age: ${ageHours} hours ago</small>
            </div>
        </div>
    `;
}

// Function to update map with latest data
async function updateMap() {
    try {
        const response = await fetch('/api/data/latest');
        const result = await response.json();
        
        console.log(`Received ${result.count} readings`);
        
        result.data.forEach(reading => {
            // Skip readings with invalid coordinates
            if (reading.la == -1 || reading.lo == -1) {
                return;
            }
            
            const key = `${reading.t}`;
            
            // Don't create duplicate markers
            if (markers[key]) {
                return;
            }
            
            // Get colors based on PM2.5 value and age
            const color = getColor(reading.pm25);
            const borderColor = getBorderColor(reading.age_hours);
            const pm25Value = reading.pm25 ? Math.round(reading.pm25) : 'N/A';
            
            // Create custom icon with PM2.5 value inside
            const icon = L.divIcon({
                className: 'air-quality-marker',
                html: `<div style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background-color: ${color};
                    border: 4px solid ${borderColor};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    font-weight: bold;
                    font-size: 18px;
                    color: #000;
                ">${pm25Value}</div>`,
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });

            // Create marker with custom icon
            const marker = L.marker([reading.la, reading.lo], { icon: icon })
                .bindPopup(createPopupContent(reading))
                .addTo(map);
            
            markers[key] = marker;
        });
        
        // Update status only if element exists
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Last updated: ${new Date().toLocaleTimeString()} - ${result.count} readings`;
        }
        
        console.log(`✅ Map updated with ${result.count} readings`);
            
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // Update status only if element exists
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Error: ${error.message}`;
        }
    }
}

// Update map every 30 seconds
updateMap();
setInterval(updateMap, 30000);