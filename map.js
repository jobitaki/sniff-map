// Initialize map centered on Pittsburgh
let map = L.map('map').setView([40.447778, -79.936917], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Store markers for updates
let markers = {};
let markerData = {}; // Store reading data for zoom updates

// Function to get marker size and style based on zoom level
function getMarkerStyle(zoom) {
    if (zoom < 14) {
        return { size: 20, fontSize: 0, border: 2, showNumber: false };
    } else {
        return { size: 40, fontSize: 14, border: 3, showNumber: true };
    }
}

// Function to create marker icon based on zoom level
function createMarkerIcon(reading, zoom) {
    const { aqi, pollutant } = getMaxAQI(reading);
    const color = getColor(aqi);
    const borderColor = getBorderColor(reading.age_hours);
    const aqiValue = aqi !== null ? aqi : 'N/A';
    const style = getMarkerStyle(zoom);
    
    return L.divIcon({
        className: 'air-quality-marker',
        html: `<div style="
            width: ${style.size}px;
            height: ${style.size}px;
            border-radius: 50%;
            background-color: ${color};
            border: ${style.border}px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-weight: 400;
            font-size: ${style.fontSize}px;
            color: #FFF;
        ">${style.showNumber ? aqiValue : ''}</div>`,
        iconSize: [style.size, style.size],
        iconAnchor: [style.size / 2, style.size / 2]
    });
}

// Function to update marker icons based on current zoom
function updateMarkerIcons() {
    const currentZoom = map.getZoom();
    Object.entries(markers).forEach(([key, marker]) => {
        const reading = markerData[key];
        if (reading) {
            const newIcon = createMarkerIcon(reading, currentZoom);
            marker.setIcon(newIcon);
        }
    });
}

// Listen for zoom events to update marker sizes
map.on('zoomend', updateMarkerIcons);

// Function to calculate AQI from pollutant concentration using EPA formula
function calculateAQI(concentration, pollutant) {
    if (concentration === null || concentration === undefined || concentration < 0) {
        return null;
    }
    
    // Truncate concentration based on pollutant type
    let C_p;
    if (pollutant === 'PM2.5') {
        C_p = Math.floor(concentration * 10) / 10; // Truncate to 1 decimal place
    } else if (pollutant === 'PM10') {
        C_p = Math.floor(concentration); // Truncate to integer
    } else {
        return null;
    }
    
    // Breakpoint table for PM2.5 (24-hour) and PM10 (24-hour)
    const breakpoints = {
        'PM2.5': [
            { C_low: 0.0, C_high: 9.0, I_low: 0, I_high: 50 },
            { C_low: 9.1, C_high: 35.4, I_low: 51, I_high: 100 },
            { C_low: 35.5, C_high: 55.4, I_low: 101, I_high: 150 },
            { C_low: 55.5, C_high: 125.4, I_low: 151, I_high: 200 },
            { C_low: 125.5, C_high: 225.4, I_low: 201, I_high: 300 },
            { C_low: 225.5, C_high: 500, I_low: 301, I_high: 500 }
        ],
        'PM10': [
            { C_low: 0, C_high: 54, I_low: 0, I_high: 50 },
            { C_low: 55, C_high: 154, I_low: 51, I_high: 100 },
            { C_low: 155, C_high: 254, I_low: 101, I_high: 150 },
            { C_low: 255, C_high: 354, I_low: 151, I_high: 200 },
            { C_low: 355, C_high: 424, I_low: 201, I_high: 300 },
            { C_low: 425, C_high: 604, I_low: 301, I_high: 500 }
        ]
    };
    
    // Find the appropriate breakpoint range
    const ranges = breakpoints[pollutant];
    if (!ranges) return null;
    
    let BP_low = null, BP_high = null, I_low = null, I_high = null;
    
    for (const range of ranges) {
        if (C_p >= range.C_low && C_p <= range.C_high) {
            BP_low = range.C_low;
            BP_high = range.C_high;
            I_low = range.I_low;
            I_high = range.I_high;
            break;
        }
    }
    
    // If concentration is beyond the highest breakpoint, use the highest range
    if (BP_low === null && C_p > ranges[ranges.length - 1].C_high) {
        BP_low = ranges[ranges.length - 1].C_low;
        BP_high = ranges[ranges.length - 1].C_high;
        I_low = ranges[ranges.length - 1].I_low;
        I_high = ranges[ranges.length - 1].I_high;
    }
    
    if (BP_low === null) return null;
    
    // Calculate AQI using the formula: I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
    const I_p = ((I_high - I_low) / (BP_high - BP_low)) * (C_p - BP_low) + I_low;
    
    // Round to nearest integer
    return Math.round(I_p);
}

// Function to get the maximum AQI from available pollutants
function getMaxAQI(reading) {
    const pm25_aqi = calculateAQI(reading.pm25, 'PM2.5');
    const pm10_aqi = calculateAQI(reading.pm10, 'PM10');
    
    const pollutants = [
        { aqi: pm25_aqi, name: 'PM2.5' },
        { aqi: pm10_aqi, name: 'PM10' }
    ].filter(p => p.aqi !== null);
    
    if (pollutants.length === 0) return { aqi: null, pollutant: null };
    
    // Find the pollutant with the maximum AQI
    const maxPollutant = pollutants.reduce((max, current) => 
        current.aqi > max.aqi ? current : max
    );
    
    return { aqi: maxPollutant.aqi, pollutant: maxPollutant.name };
}

// Function to get color based on AQI value
function getColor(aqi) {
    if (aqi === null || aqi < 0) return '#808080'; // Gray for no data
    if (aqi <= 50) return '#22c55e'; // Good (Green)
    if (aqi <= 100) return '#84cc16'; // Moderate (Yellow)
    if (aqi <= 150) return '#eab308'; // Unhealthy for Sensitive (Orange)
    if (aqi <= 200) return '#f97316'; // Unhealthy (Red)
    if (aqi <= 300) return '#ef4444'; // Very Unhealthy (Purple)
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
function getAQICategory(aqi) {
    if (aqi === null || aqi < 0) return 'No Data';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// Function to format AQI category with special styling
function formatAQICategory(aqi, isMobile = false, categorySize = '32px', goodSize = '48px', sensitiveSize = '32px', sensitiveSubSize = '16px') {
    const category = getAQICategory(aqi);

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
            <div style="font-size: 24px;">Unhealthy</div>
            <div style="font-size: 14px;">for Sensitive Groups</div>
        </div>`;
    }
    
    if (category === 'Unhealthy') {
        return '<div style="font-size: 24px; font-weight: 500; line-height: 1.2;">Unhealthy</div>';
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

// Get data source label and color
function getDataSourceTag(source) {
    if (source === 0) {
        return { label: 'ACHD', color: '#8b5cf6' }; // purple-500
    } else if (source === 1) {
        return { label: 'POGOH', color: '#10b981' }; // green-500
    } else if (source === 2) {
        return { label: 'Test', color: '#f59e0b' }; // amber-500
    } else {
        return { label: 'Unknown', color: '#6b7280' }; // gray-500
    }
}

// Get VOC/NOx index level tag (Sensirion sensor range: 1-500)
function getIndexLevelTag(indexValue) {
    if (indexValue === null || indexValue === undefined) {
        return { label: 'N/A', color: '#9ca3af' }; // gray-400
    }
    
    if (indexValue <= 100) {
        return { label: 'Excellent', color: '#22c55e' }; // green-500
    } else if (indexValue <= 150) {
        return { label: 'Good', color: '#84cc16' }; // lime-500
    } else if (indexValue <= 200) {
        return { label: 'Moderate', color: '#eab308' }; // yellow-500
    } else if (indexValue <= 250) {
        return { label: 'Fair', color: '#f97316' }; // orange-500
    } else if (indexValue <= 350) {
        return { label: 'Poor', color: '#ef4444' }; // red-500
    } else {
        return { label: 'Very Poor', color: '#991b1b' }; // red-800
    }
}

// Function to create popup content
function createPopupContent(reading) {
    const timestamp = new Date(reading.t * 1000);
    const { aqi, pollutant } = getMaxAQI(reading);
    const aqiValue = aqi !== null ? aqi : 'N/A';
    const aqiLabel = pollutant ? `${pollutant} AQI` : 'AQI';
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
            <div style="background-color: ${getColor(aqi)}; padding: ${isMobile ? '16px 12px' : '20px 16px'}; color: white;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${isMobile ? '10px' : '12px'}; gap: ${isMobile ? '8px' : '12px'};">
                    <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
                        <div style="background-color: rgba(0,0,0,0.1); padding: ${isMobile ? '8px 14px' : '8px 14px'}; border-radius: 12px; margin-bottom: 8px; display: flex; flex-direction: column; align-items: center;">
                            <div style="font-size: ${numberSize}; font-weight: 700; line-height: 1; text-align: center;">${aqiValue}</div>
                            <div style="font-size: ${isMobile ? '10px' : '11px'}; font-weight: 500; opacity: 0.9; text-align: center;">${aqiLabel}</div>
                        </div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: ${isMobile ? '8px' : '10px'};">
                        <div style="font-size: ${isMobile ? '11px' : '12px'};">${formatAge(reading.age_hours)}</div>
                        <div>${formatAQICategory(aqi, isMobile, categorySize, goodSize, sensitiveSize, sensitiveSubSize)}</div>
                    </div>
                </div>
                <div style="width: 100%; height: 1px; background-color: rgba(255,255,255,0.3); margin: 12px 0;"></div>
                <div style="font-size: 14px; display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
                    <span style="white-space: nowrap; font-weight: 600;">VOC Index</span>
                    <span style="white-space: nowrap;">${getIndexLevelTag(reading.v).label}</span>
                </div>
                <div style="font-size: 14px; display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
                    <span style="white-space: nowrap; font-weight: 600;">NOx Index</span>
                    <span style="white-space: nowrap;">${getIndexLevelTag(reading.n).label}</span>
                </div>
            </div>
            
            <!-- White Section -->
            <div style="background: white; padding: 16px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <div style="background: ${getDataFreshnessTag(reading.age_hours).color}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; white-space: nowrap;">
                            ${getDataFreshnessTag(reading.age_hours).label}
                        </div>
                        <div style="background: ${getDataSourceTag(reading.src).color}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; white-space: nowrap;">
                            ${getDataSourceTag(reading.src).label}
                        </div>
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
                            <td style="font-weight: 600; text-align: right;">${reading.pm1?.toFixed(1) ?? 'N/A'} µg/m³</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">PM2.5</td>
                            <td style="font-weight: 600; text-align: right;">${reading.pm25?.toFixed(1) ?? 'N/A'} µg/m³</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">PM10</td>
                            <td style="font-weight: 600; text-align: right;">${reading.pm10?.toFixed(1) ?? 'N/A'} µg/m³</td>
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
                            <td style="font-weight: 600; text-align: right;">${reading.c?.toFixed(0) ?? 'N/A'} ppm</td>
                        </tr>
                        <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <td style="color: #666;">Temperature</td>
                            <td style="font-weight: 600; text-align: right;">${reading.tmp?.toFixed(1) ?? 'N/A'} °C</td>
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
                    
                    <!-- Bike Metadata Section -->
                    <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Bike Metadata</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                                <td style="color: #666;">GPS Location</td>
                                <td style="font-weight: 600; text-align: right;">${reading.la?.toFixed(6) ?? 'N/A'}° ${reading.lad ?? ''}, ${reading.lo?.toFixed(6) ?? 'N/A'}° ${reading.lod ?? ''}</td>
                            </tr>
                            <tr style="display: flex; justify-content: space-between; padding: 6px 0;">
                                <td style="color: #666;">Bike Speed</td>
                                <td style="font-weight: 600; text-align: right;">${reading.bs !== null && reading.bs !== undefined && reading.bs >= 0 ? reading.bs.toFixed(1) + ' km/h' : 'N/A'}</td>
                            </tr>
                        </table>
                    </div>
                    
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
        const isMobile = window.innerWidth < 768;
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            toggle.textContent = 'Hide';
            
            if (isMobile) {
                // On mobile: create full-screen overlay with popup content
                const popup = document.querySelector('.air-quality-popup-modern');
                if (popup) {
                    // Save original content for restoration
                    const originalContent = popup.cloneNode(true);
                    popup.setAttribute('data-original', 'true');
                    
                    // Create full-screen overlay with margins
                    const overlay = document.createElement('div');
                    overlay.id = 'fullscreen-popup-overlay';
                    overlay.style.cssText = `
                        position: fixed;
                        top: 16px;
                        left: 16px;
                        right: 16px;
                        bottom: 16px;
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        z-index: 10000;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                    `;
                    
                    // Clone popup content and adjust styling for full screen
                    const fullscreenContent = popup.cloneNode(true);
                    fullscreenContent.style.minWidth = '100%';
                    fullscreenContent.style.maxWidth = '100%';
                    fullscreenContent.style.borderRadius = '0';
                    fullscreenContent.style.height = '100vh';
                    fullscreenContent.style.display = 'flex';
                    fullscreenContent.style.flexDirection = 'column';
                    
                    // Ensure details are visible in fullscreen
                    const fullscreenDetails = fullscreenContent.querySelector(`#${popupId}-details`);
                    if (fullscreenDetails) {
                        fullscreenDetails.style.display = 'block';
                    }
                    
                    // Add close button at top
                    const closeButton = document.createElement('button');
                    closeButton.innerHTML = '✕';
                    closeButton.style.cssText = `
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: rgba(0,0,0,0.5);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        font-size: 15px;
                        cursor: pointer;
                        z-index: 10001;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    `;
                    closeButton.onclick = function() {
                        // Remove blur from background
                        const mapEl = document.getElementById('map');
                        const navbar = document.querySelector('.absolute.top-4');
                        const legends = document.querySelector('.absolute.bottom-6');
                        
                        if (mapEl) mapEl.style.filter = '';
                        if (navbar) navbar.style.filter = '';
                        if (legends) legends.style.filter = '';
                        
                        document.body.removeChild(overlay);
                        // Reset popup to collapsed state
                        details.style.display = 'none';
                        toggle.textContent = 'More';
                    };
                    
                    overlay.appendChild(closeButton);
                    overlay.appendChild(fullscreenContent);
                    
                    // Apply blur to background elements
                    const mapEl = document.getElementById('map');
                    const navbar = document.querySelector('.absolute.top-4');
                    const legends = document.querySelector('.absolute.bottom-6');
                    
                    if (mapEl) mapEl.style.filter = 'blur(8px)';
                    if (navbar) navbar.style.filter = 'blur(8px)';
                    if (legends) legends.style.filter = 'blur(8px)';
                    
                    document.body.appendChild(overlay);
                }
            } else {
                // Desktop: pan the map to ensure the expanded popup is fully visible
                setTimeout(() => {
                    const popup = document.querySelector('.leaflet-popup');
                    if (popup) {
                        const popupRect = popup.getBoundingClientRect();
                        const mapRect = document.getElementById('map').getBoundingClientRect();
                        
                        // Check if popup extends beyond map bounds
                        let panX = 0;
                        let panY = 0;
                        
                        if (popupRect.bottom > mapRect.bottom) {
                            panY = popupRect.bottom - mapRect.bottom + 20;
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
                }, 50);
            }
        } else {
            // Remove fullscreen overlay if it exists
            const overlay = document.getElementById('fullscreen-popup-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
            
            // Remove blur from background elements
            const mapEl = document.getElementById('map');
            const navbar = document.querySelector('.absolute.top-4');
            const legends = document.querySelector('.absolute.bottom-6');
            
            if (mapEl) mapEl.style.filter = '';
            if (navbar) navbar.style.filter = '';
            if (legends) legends.style.filter = '';
            
            details.style.display = 'none';
            toggle.textContent = 'More';
        }
    }
}

// Function to update map with latest data
async function updateMap(fitBounds = false) {
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
            
            // Store reading data for zoom updates
            markerData[key] = reading;
            
            // Create custom icon based on current zoom level
            const currentZoom = map.getZoom();
            const icon = createMarkerIcon(reading, currentZoom);

            // Create marker with custom icon
            const marker = L.marker([reading.la, reading.lo], { icon: icon })
                .bindPopup(createPopupContent(reading))
                .addTo(map);
            
            markers[key] = marker;
        });
        
        // Fit map bounds to show all markers (only on initial load)
        if (fitBounds) {
            const markerArray = Object.values(markers);
            if (markerArray.length > 0) {
                const group = L.featureGroup(markerArray);
                map.fitBounds(group.getBounds(), {
                    padding: [30, 30],  // Add 30px padding around markers
                    maxZoom: 13         // Don't zoom in too close if there's only one marker
                });
            }
        }
        
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
// Initial load: fit bounds to show all markers
updateMap(true);
// Subsequent updates: don't change zoom/center
setInterval(() => updateMap(false), 30000);