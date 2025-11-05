# NYC Crash Data Visualization

An interactive web application for analyzing and visualizing NYC motor vehicle crash data from 2012-2025. Features novel hexbin mapping, comprehensive analytics, and data-driven insights.

## Features

### 1. Hexbin Heatmap (Map View)
- **Novel visualization**: Crashes aggregated into hexagonal bins showing density patterns
- **Interactive filters**: Filter by hour, year range, severity type, and victim type
- **Rich tooltips**: See crash counts, casualties, and contributing factors per hexagon
- **Detail panels**: Click hexagons to view comprehensive statistics

### 2. Analytics Dashboard (Charts View)
Six interactive charts revealing patterns in the data:
- **Temporal Heatmap**: Hour x Day of Week showing rush hour patterns
- **Severity Distribution**: Breakdown of property damage, injuries, and fatalities
- **Contributing Factors**: Top 10 causes of crashes
- **Monthly Trends**: Seasonal patterns in crashes, injuries, and fatalities
- **Borough Comparison**: Geographic distribution across NYC
- **Vehicle Types**: Most common vehicles involved in crashes

### 3. Insights Summary
- **Key statistics**: Total crashes, casualties, dangerous times
- **Automated insights**: Data-driven findings about crash patterns
- **Top 10 dangerous intersections**: Most crash-prone locations
- **Data quality report**: Transparency about data coverage and completeness

## Technology Stack

Built with simplicity and robustness in mind:
- **Vanilla JavaScript** - No build system, no framework dependencies
- **Leaflet.js** - Interactive mapping
- **Chart.js** - Beautiful, responsive charts
- **PapaParse** - Robust CSV parsing with streaming
- **d3-hexbin** - Hexagonal binning for spatial aggregation

All libraries loaded via CDN - zero npm dependencies, runs forever without breaking.

## Setup Instructions

### 1. Download the Data

Go here to download NYC crash data:
https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95/about_data

Make sure it's in this folder and named: `Motor_Vehicle_Collisions_-_Crashes.csv`

### 2. Start Local Server

```bash
# Navigate to project directory
cd /Users/deniz/Build/mit/workshop/ai-for-research

# Start Python HTTP server (choose any available port)
python3 -m http.server 8080
```

### 3. Open in Browser

Navigate to: `http://localhost:8080`

The application will:
- Load and parse the CSV file (first time takes ~30 seconds)
- Process and aggregate the data
- Cache results in browser localStorage for faster subsequent loads
- Display all visualizations

## Data Sampling

For performance, the application samples every 10th record by default, giving you ~220K crashes to analyze. This is sufficient to reveal all patterns while maintaining smooth performance.

To adjust sampling:
- Edit `CONFIG.SAMPLING_RATE` in `js/utils.js`
- Lower number = more data (slower)
- Higher number = less data (faster)

## Performance

- **First load**: ~30 seconds (parsing 2.2M records)
- **Subsequent loads**: <2 seconds (from cache)
- **Filter changes**: <500ms
- **View switching**: Instant

## Browser Requirements

- Modern browser with ES6+ support (Chrome, Firefox, Safari, Edge)
- LocalStorage enabled (for caching)
- JavaScript enabled

## File Structure

```
├── Motor_Vehicle_Collisions_-_Crashes.csv  # Data file (not in git)
├── README.md
├── .gitignore
├── index.html                               # Main entry point
├── css/
│   ├── main.css                             # Global styles
│   ├── map-view.css                         # Map view styles
│   ├── charts-view.css                      # Charts view styles
│   └── insights-view.css                    # Insights view styles
└── js/
    ├── utils.js                             # Utility functions
    ├── data-loader.js                       # CSV loading
    ├── data-processor.js                    # Data aggregation
    ├── map-view.js                          # Hexbin map
    ├── charts-view.js                       # Charts
    └── insights-view.js                     # Insights
```

## Key Findings (from the data)

- **2.2M+ crashes** from July 2012 to October 2025
- **Driver Inattention/Distraction** is the #1 cause (25% of crashes)
- **Afternoon rush hour** (4-6 PM) is the most dangerous time
- **COVID-19 impact**: 47% reduction in crashes from 2019 to 2020
- **Pedestrian risk**: 1,736 pedestrian deaths over 13 years

## Customization

### Changing Colors
Edit color scales in `js/utils.js`:
```javascript
COLOR_SCALES: {
    density: [...],  // Hexbin colors
    severity: [...]  // Severity colors
}
```

### Adjusting Hexbin Size
Edit in `js/utils.js`:
```javascript
HEXBIN_RADIUS: 0.002  // Larger = bigger hexagons
```

### Cache Expiry
Edit in `js/utils.js`:
```javascript
CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000  // Default: 7 days
```

## Troubleshooting

**Problem**: CSV won't load
- **Solution**: Make sure the CSV file is named exactly `Motor_Vehicle_Collisions_-_Crashes.csv` and is in the project root

**Problem**: Slow performance
- **Solution**: Increase `SAMPLING_RATE` in `js/utils.js` to sample less data

**Problem**: Nothing displays
- **Solution**: Check browser console for errors. Make sure JavaScript is enabled.

**Problem**: Port 8080 already in use
- **Solution**: Use a different port: `python3 -m http.server 8081`

## Data Source

NYC Open Data - Motor Vehicle Collisions (Crashes)
https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95/about_data

Updated regularly by the NYC Police Department

## License

This visualization tool is open source. The NYC crash data is provided by NYC Open Data under their terms of use.


