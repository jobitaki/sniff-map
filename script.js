// Simple Air Quality Map Implementation
class SimpleAirQualityMap {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.zoom = 10;
        this.centerLat = 40.7128;
        this.centerLng = -74.0060;
        this.currentData = [];
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.mapOffset = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.initCanvas();
        this.loadSampleData();
        this.setupEventListeners();
        this.draw();
    }

    initCanvas() {
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        
        // Setup canvas event listeners
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
        
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }

    resizeCanvas() {
        const container = document.getElementById('map');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Set actual size
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    loadSampleData() {
        // Sample air quality data points for New York City area
        this.currentData = [
            {
                id: 1,
                lat: 40.7589,
                lng: -73.9851,
                location: "Times Square, NYC",
                pollutants: {
                    pm25: 45,
                    pm10: 52,
                    no2: 38,
                    o3: 89
                },
                aqi: 89,
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                lat: 40.7505,
                lng: -73.9934,
                location: "Herald Square, NYC",
                pollutants: {
                    pm25: 62,
                    pm10: 78,
                    no2: 45,
                    o3: 102
                },
                aqi: 102,
                timestamp: new Date(Date.now() - 300000).toISOString()
            },
            {
                id: 3,
                lat: 40.7614,
                lng: -73.9776,
                location: "Central Park South",
                pollutants: {
                    pm25: 28,
                    pm10: 35,
                    no2: 22,
                    o3: 45
                },
                aqi: 45,
                timestamp: new Date(Date.now() - 600000).toISOString()
            },
            {
                id: 4,
                lat: 40.7282,
                lng: -74.0776,
                location: "Battery Park, NYC",
                pollutants: {
                    pm25: 78,
                    pm10: 95,
                    no2: 65,
                    o3: 125
                },
                aqi: 125,
                timestamp: new Date(Date.now() - 900000).toISOString()
            },
            {
                id: 5,
                lat: 40.6892,
                lng: -74.0445,
                location: "Brooklyn Bridge",
                pollutants: {
                    pm25: 35,
                    pm10: 42,
                    no2: 28,
                    o3: 67
                },
                aqi: 67,
                timestamp: new Date(Date.now() - 1200000).toISOString()
            }
        ];
    }

    // Convert latitude/longitude to canvas coordinates
    latLngToCanvas(lat, lng) {
        // Simple equirectangular projection with more reasonable scaling
        const scale = this.zoom * 1000; // Much smaller scale factor
        const x = (lng - this.centerLng) * scale + this.width / 2 + this.mapOffset.x;
        const y = (this.centerLat - lat) * scale + this.height / 2 + this.mapOffset.y;
        return { x, y };
    }

    // Convert canvas coordinates to latitude/longitude
    canvasToLatLng(x, y) {
        const scale = this.zoom * 1000; // Match the scale used in latLngToCanvas
        const lng = (x - this.width / 2 - this.mapOffset.x) / scale + this.centerLng;
        const lat = this.centerLat - (y - this.height / 2 - this.mapOffset.y) / scale;
        return { lat, lng };
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background grid
        this.drawGrid();
        
        // Draw data points
        this.drawDataPoints();
        
        // Update coordinates display
        this.updateCoordinatesDisplay();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        
        const gridSpacing = 50;
        
        // Vertical lines
        for (let x = 0; x < this.width; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.height; y += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }

    drawDataPoints() {
        const pollutantFilter = document.getElementById('pollutant-filter').value;
        
        // Draw data points at fixed positions for now to ensure they're visible
        const fixedPositions = [
            { x: 200, y: 150 },
            { x: 400, y: 200 },
            { x: 600, y: 180 },
            { x: 300, y: 300 },
            { x: 800, y: 250 }
        ];
        
        this.currentData.forEach((point, index) => {
            if (this.shouldShowPoint(point, pollutantFilter) && index < fixedPositions.length) {
                this.drawDataPoint(point, fixedPositions[index]);
            }
        });
    }

    drawDataPoint(dataPoint, position) {
        const color = this.getAQIColor(dataPoint.aqi);
        const radius = 12;
        
        // Draw outer circle (white border)
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, radius + 2, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Draw inner circle (AQI color)
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        // Draw AQI value
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(dataPoint.aqi.toString(), position.x, position.y);
        
        // Store position for click detection
        dataPoint._canvasPos = position;
    }

    shouldShowPoint(point, filter) {
        if (filter === 'all') return true;
        return point.pollutants.hasOwnProperty(filter);
    }

    getAQIColor(aqi) {
        if (aqi <= 50) return '#00e400';      // Good
        if (aqi <= 100) return '#ffff00';     // Moderate
        if (aqi <= 150) return '#ff7e00';     // Unhealthy for Sensitive Groups
        if (aqi <= 200) return '#ff0000';     // Unhealthy
        if (aqi <= 300) return '#8f3f97';     // Very Unhealthy
        return '#7e0023';                     // Hazardous
    }

    getAQICategory(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }

    updateCoordinatesDisplay() {
        const coords = document.getElementById('coordinates');
        if (coords) {
            coords.textContent = `Lat: ${this.centerLat.toFixed(4)}, Lng: ${this.centerLng.toFixed(4)} | Zoom: ${this.zoom.toFixed(1)}x`;
        }
    }

    // Event handlers
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMousePos.x;
            const deltaY = e.clientY - this.lastMousePos.y;
            
            this.mapOffset.x += deltaX;
            this.mapOffset.y += deltaY;
            
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.draw();
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(10, this.zoom * zoomFactor));
        
        if (newZoom !== this.zoom) {
            // Zoom towards mouse position
            const beforeZoom = this.canvasToLatLng(mouseX, mouseY);
            this.zoom = newZoom;
            const afterZoom = this.canvasToLatLng(mouseX, mouseY);
            
            // Adjust offset to keep the same point under the mouse
            const deltaLat = afterZoom.lat - beforeZoom.lat;
            const deltaLng = afterZoom.lng - beforeZoom.lng;
            
            this.mapOffset.x += deltaLng * this.zoom * 1000; // Match the scale
            this.mapOffset.y -= deltaLat * this.zoom * 1000;
            
            this.draw();
        }
    }

    onCanvasClick(e) {
        if (this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check if click is on a data point
        for (const point of this.currentData) {
            if (point._canvasPos) {
                const distance = Math.sqrt(
                    Math.pow(clickX - point._canvasPos.x, 2) + 
                    Math.pow(clickY - point._canvasPos.y, 2)
                );
                
                if (distance <= 14) { // Click tolerance
                    this.showDataPointInfo(point, e);
                    return;
                }
            }
        }
    }

    showDataPointInfo(dataPoint, event) {
        // Remove existing popup
        const existingPopup = document.querySelector('.data-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // Create popup
        const popup = document.createElement('div');
        popup.className = 'data-popup';
        popup.innerHTML = this.createPopupContent(dataPoint);
        
        // Position popup
        popup.style.position = 'absolute';
        popup.style.left = (event.clientX + 10) + 'px';
        popup.style.top = (event.clientY - 10) + 'px';
        popup.style.background = 'white';
        popup.style.border = '1px solid #ccc';
        popup.style.borderRadius = '4px';
        popup.style.padding = '10px';
        popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        popup.style.zIndex = '1000';
        popup.style.maxWidth = '250px';
        popup.style.fontSize = '12px';
        popup.style.lineHeight = '1.4';
        
        document.body.appendChild(popup);
        
        // Remove popup when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function removePopup() {
                popup.remove();
                document.removeEventListener('click', removePopup);
            });
        }, 100);
    }

    createPopupContent(dataPoint) {
        const timestamp = new Date(dataPoint.timestamp).toLocaleString();
        const aqiCategory = this.getAQICategory(dataPoint.aqi);
        
        return `
            <div class="popup-content">
                <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${dataPoint.location}</h4>
                <p style="margin: 4px 0; font-weight: bold; color: ${this.getAQIColor(dataPoint.aqi)};">AQI: ${dataPoint.aqi} (${aqiCategory})</p>
                <p style="margin: 4px 0; font-weight: bold;">Pollutants:</p>
                <p style="margin: 2px 0;">PM2.5: ${dataPoint.pollutants.pm25} µg/m³</p>
                <p style="margin: 2px 0;">PM10: ${dataPoint.pollutants.pm10} µg/m³</p>
                <p style="margin: 2px 0;">NO2: ${dataPoint.pollutants.no2} µg/m³</p>
                <p style="margin: 2px 0;">O3: ${dataPoint.pollutants.o3} µg/m³</p>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 11px; font-style: italic;">Updated: ${timestamp}</p>
            </div>
        `;
    }

    zoomIn() {
        this.zoom = Math.min(10, this.zoom * 1.2);
        this.draw();
    }

    zoomOut() {
        this.zoom = Math.max(0.1, this.zoom / 1.2);
        this.draw();
    }

    setupEventListeners() {
        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        
        // Data source selector
        document.getElementById('data-source').addEventListener('change', (e) => {
            const uploadBtn = document.getElementById('upload-btn');
            const fileInput = document.getElementById('file-input');
            
            if (e.target.value === 'upload') {
                uploadBtn.style.display = 'block';
                fileInput.style.display = 'block';
            } else {
                uploadBtn.style.display = 'none';
                fileInput.style.display = 'none';
                this.loadSampleData();
                this.draw();
            }
        });

        // Pollutant filter
        document.getElementById('pollutant-filter').addEventListener('change', () => {
            this.draw();
        });

        // File upload
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                if (file.name.endsWith('.json')) {
                    data = JSON.parse(e.target.result);
                } else if (file.name.endsWith('.csv')) {
                    data = this.parseCSV(e.target.result);
                } else {
                    alert('Please upload a JSON or CSV file');
                    return;
                }

                if (this.validateData(data)) {
                    this.currentData = data;
                    this.draw();
                    alert('Data loaded successfully!');
                } else {
                    alert('Invalid data format. Please check your file.');
                }
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const point = {};
            
            headers.forEach((header, index) => {
                if (header === 'lat' || header === 'lng') {
                    point[header] = parseFloat(values[index]);
                } else if (header === 'aqi' || header.startsWith('pm') || header === 'no2' || header === 'o3') {
                    if (!point.pollutants) point.pollutants = {};
                    if (header === 'aqi') {
                        point.aqi = parseInt(values[index]);
                    } else {
                        point.pollutants[header] = parseFloat(values[index]);
                    }
                } else {
                    point[header] = values[index];
                }
            });
            
            if (!point.id) point.id = i;
            if (!point.timestamp) point.timestamp = new Date().toISOString();
            
            data.push(point);
        }

        return data;
    }

    validateData(data) {
        if (!Array.isArray(data)) return false;
        
        return data.every(point => {
            return point.lat && point.lng && 
                   typeof point.lat === 'number' && 
                   typeof point.lng === 'number' &&
                   point.aqi !== undefined;
        });
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.airQualityMap = new SimpleAirQualityMap();
});

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleAirQualityMap;
}