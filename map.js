// Initialize map centered on Pittsburgh
let map = L.map('map').setView([40.447778, -79.936917], 13);

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

// Function to format AQI category with special styling
function formatAQICategory(pm25, isMobile = false, categorySize = '32px', goodSize = '48px', sensitiveSize = '32px', sensitiveSubSize = '16px') {
    const category = getAQICategory(pm25);

    if (category === 'Hazardous') {
        return '<div style="font-size: 24px; font-weight: 500; line-height: 1.2;">Hazardous</div>';
    }
    
    if (category === 'Very Unhealthy') {
        return `<div style="font-size: 24px; font-weight: 500; line-height: 1.3;">
            <div>Very</div>
            <div>Unhealthy</div>
        </div>`;
    }
    
    if (category === 'Unhealthy for Sensitive Groups') {
        return `<div style="font-weight: 500; line-height: 1.3;">
            <div style="font-size: ${sensitiveSize};">Unhealthy</div>
            <div style="font-size: ${sensitiveSubSize};">for Sensitive Groups</div>
        </div>`;
    }
    
    if (category === 'Good') {
        return `<div style="font-size: ${goodSize}; font-weight: 500; line-height: 1.2;">Good</div>`;
    }
    
    return `<div style="font-size: ${categorySize}; font-weight: 500; line-height: 1.2;">${category}</div>`;
}

// Format age display with convenient units
function formatAge(ageHours) {
    const ageSeconds = ageHours * 3600;
    
    if (ageSeconds < 60) {
        return `${Math.round(ageSeconds)} seconds ago`;
    } else if (ageHours < 1) {
        return `${Math.round(ageHours * 60)} minutes ago`;
    } else if (ageHours < 24) {
        const hours = Math.round(ageHours);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
        const days = Math.round(ageHours / 24);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
}

// Get data freshness label and color (matching legend: blue-500 to gray-300)
function getDataFreshnessTag(ageHours) {
    if (ageHours < 1) {
        return { label: 'New Data', color: '#3b82f6' }; // blue-500 - matches darkest blue in legend
    } else if (ageHours < 6) {
        return { label: 'Recent Data', color: '#60a5fa' }; // blue-400 - matches medium-dark blue
    } else if (ageHours < 24) {
        return { label: 'Older Data', color: '#93c5fd' }; // blue-300 - matches light blue
    } else {
        return { label: 'Stale Data', color: '#d1d5db' }; // gray-300 - matches stale marker
    }
}

// Function to create popup content
function createPopupContent(reading) {
    const timestamp = new Date(reading.t * 1000);
    const pm25Value = reading.pm25 ? Math.round(reading.pm25) : 'N/A';
    const popupId = `popup-${reading.t}`;
    const isMobile = window.innerWidth < 768;
    
    // Scale down sizes for mobile
    const numberSize = isMobile ? '48px' : '64px';
    const categorySize = isMobile ? '24px' : '32px';
    const goodSize = isMobile ? '36px' : '48px';
    const sensitiveSize = isMobile ? '24px' : '32px';
    const sensitiveSubSize = isMobile ? '12px' : '16px';
    
    return `
        <div class="air-quality-popup-modern" style="min-width: ${isMobile ? '260px' : '300px'}; max-width: ${isMobile ? '300px' : '340px'};">
            <!-- Header Section -->
            <div style="background-color: ${getColor(reading.pm25)}; padding: ${isMobile ? '16px 12px' : '20px 16px'}; color: white;">
                <div style="font-size: ${isMobile ? '11px' : '12px'}; margin-bottom: ${isMobile ? '10px' : '12px'};">${formatAge(reading.age_hours)}</div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isMobile ? '10px' : '12px'}; gap: ${isMobile ? '8px' : '12px'};">
                    <div style="flex: 1;">${formatAQICategory(reading.pm25, isMobile, categorySize, goodSize, sensitiveSize, sensitiveSubSize)}</div>
                    <div style="font-size: ${numberSize}; font-weight: 700; line-height: 1; flex-shrink: 0;">${pm25Value}</div>
                </div>
                <div style="width: 100%; height: 1px; background-color: rgba(255,255,255,0.3); margin: 12px 0;"></div>
                <div style="font-size: 14px; display: flex; justify-content: space-between; width: 100%; gap: 8px;">
                    <span style="white-space: nowrap;">Main Pollutant: PM 2.5</span>
                    <span style="white-space: nowrap;">${reading.pm25?.toFixed(1) ?? 'N/A'} ug/m</span>
                </div>
            </div>
            
            <!-- White Section -->
            <div style="background: white; padding: 16px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="background: ${getDataFreshnessTag(reading.age_hours).color}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 500; white-space: nowrap;">
                        ${getDataFreshnessTag(reading.age_hours).label}
                    </div>
                    <button onclick="toggleDetails('${popupId}')" id="${popupId}-toggle" style="background: none; border: none; cursor: pointer; font-size: 16px; font-weight: 600; color: #333;">
                        More
                    </button>
                </div>
                
                <!-- Expandable Details -->
                <div id="${popupId}-details" style="display: none; border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 15px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">PM1.0</td>
                            <td style="font-weight: 600; text-align: right;">${reading.pm1?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">PM2.5</td>
                            <td style="font-weight: 600; text-align: right;">${reading.pm25?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">PM10</td>
                            <td style="font-weight: 600; text-align: right;">${reading.pm10?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">VOC Index</td>
                            <td style="font-weight: 600; text-align: right;">${reading.v?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">NOx Index</td>
                            <td style="font-weight: 600; text-align: right;">${reading.n?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">CO2</td>
                            <td style="font-weight: 600; text-align: right;">${reading.c?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">Temperature</td>
                            <td style="font-weight: 600; text-align: right;">${reading.tmp?.toFixed(0) ?? 'N/A'}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">Humidity</td>
                            <td style="font-weight: 600; text-align: right;">${reading.rh?.toFixed(0) ?? 'N/A'}%</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">Date</td>
                            <td style="font-weight: 600; text-align: right;">${timestamp.toLocaleDateString()}</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">Time</td>
                            <td style="font-weight: 600; text-align: right;">${timestamp.toLocaleTimeString()}</td>
                        </tr>
                    </table>
                    <div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 12px; color: #666;">
                        <a href="#" style="color: #0ea5e9; text-decoration: none;">Learn more about these numbers</a>
                        <a href="#" style="color: #0ea5e9; text-decoration: none;">Disclaimer</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle function for popup details
window.toggleDetails = function(popupId) {
    const details = document.getElementById(`${popupId}-details`);
    const toggle = document.getElementById(`${popupId}-toggle`);
    
    if (details && toggle) {
        if (details.style.display === 'none') {
            details.style.display = 'block';
            toggle.textContent = 'Hide';
            
            // Pan the map to ensure the expanded popup is fully visible
            setTimeout(() => {
                const popup = document.querySelector('.leaflet-popup');
                if (popup) {
                    const popupRect = popup.getBoundingClientRect();
                    const mapRect = document.getElementById('map').getBoundingClientRect();
                    
                    // Check if popup extends beyond map bounds
                    let panX = 0;
                    let panY = 0;
                    
                    if (popupRect.bottom > mapRect.bottom) {
                        panY = popupRect.bottom - mapRect.bottom + 20; // Add 20px padding
                    }
                    if (popupRect.top < mapRect.top) {
                        panY = popupRect.top - mapRect.top - 20;
                    }
                    if (popupRect.right > mapRect.right) {
                        panX = popupRect.right - mapRect.right + 20;
                    }
                    if (popupRect.left < mapRect.left) {
                        panX = popupRect.left - mapRect.left - 20;
                    }
                    
                    if (panX !== 0 || panY !== 0) {
                        map.panBy([panX, panY], { animate: true, duration: 0.3 });
                    }
                }
            }, 50); // Small delay to let the popup expand first
        } else {
            details.style.display = 'none';
            toggle.textContent = 'More';
        }
    }
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
                    color: #FFF;
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