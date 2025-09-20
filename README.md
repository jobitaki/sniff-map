# sniff-map
Website for the SNIFF project - Air Quality Monitor.

## Overview
A website with an interactive map that plots air quality data points. The map displays Air Quality Index (AQI) values and detailed pollutant information for various locations.

## Features
- **Interactive Map**: Pan and zoom to explore different areas
- **Air Quality Data Points**: Colored markers indicating AQI levels
- **Detailed Information**: Click on data points to see pollutant details
- **Pollutant Filtering**: Filter display by specific pollutants (PM2.5, PM10, NO2, O3)
- **Data Upload**: Support for custom data via JSON or CSV files
- **Responsive Design**: Works on desktop and mobile devices

## Usage
1. Open `index.html` in a web browser
2. Use zoom controls (+/-) to adjust map zoom level
3. Click and drag to pan around the map
4. Click on colored data points to see detailed air quality information
5. Use the "Show Pollutant" dropdown to filter by specific pollutants
6. Switch to "Upload Data" to load your own air quality data

## Data Format
### CSV Format
```csv
lat,lng,location,aqi,pm25,pm10,no2,o3
40.7589,-73.9851,"Times Square NYC",89,45,52,38,89
```

### JSON Format
```json
[
  {
    "lat": 40.7589,
    "lng": -73.9851,
    "location": "Times Square NYC",
    "aqi": 89,
    "pollutants": {
      "pm25": 45,
      "pm10": 52,
      "no2": 38,
      "o3": 89
    }
  }
]
```

## Air Quality Index (AQI) Scale
- **Good (0-50)**: Green - Air quality is satisfactory
- **Moderate (51-100)**: Yellow - Acceptable for most people
- **Unhealthy for Sensitive Groups (101-150)**: Orange - Sensitive individuals may experience health effects
- **Unhealthy (151-200)**: Red - Everyone may experience health effects
- **Very Unhealthy (201-300)**: Purple - Health alert for everyone
- **Hazardous (301+)**: Maroon - Emergency conditions

## Files
- `index.html` - Main webpage
- `style.css` - Styling and layout
- `script.js` - Interactive map functionality
- `sample-data.csv` - Example data file
