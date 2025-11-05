// Map view with hexbin visualization

let map;
let hexLayer;
let currentHexbins = [];

function initializeMapView() {
    console.log('Initializing map view...');

    // Create Leaflet map centered on NYC
    map = L.map('map').setView([40.7128, -73.9960], 11);

    // Add base map tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Create hexbin layer
    hexLayer = L.layerGroup().addTo(map);

    // Set up filter controls
    setupMapFilters();

    // Initial render
    updateMapView();

    console.log('Map view initialized');
}

function setupMapFilters() {
    // Hour filter
    const hourSlider = document.getElementById('hour-filter');
    const hourDisplay = document.getElementById('hour-display');
    const hourTrackFill = document.getElementById('hour-track-fill');

    // Helper function to format hour display
    const formatHourDisplay = (hour) => {
        if (hour === 0) return 'All Hours';

        // Convert to 12-hour format with range
        const startHour = hour - 1;
        const endHour = hour;

        const formatTime = (h) => {
            if (h === 0) return '12am';
            if (h < 12) return `${h}am`;
            if (h === 12) return '12pm';
            return `${h - 12}pm`;
        };

        return `${formatTime(startHour)} - ${formatTime(endHour)}`;
    };

    // Update hour track fill
    const updateHourTrackFill = () => {
        const value = parseInt(hourSlider.value);
        const max = parseInt(hourSlider.max);
        const percentage = (value / max) * 100;
        hourTrackFill.style.width = `${percentage}%`;
    };

    hourSlider.addEventListener('input', (e) => {
        const hour = parseInt(e.target.value);
        appData.currentFilters.hour = hour === 0 ? null : hour;
        hourDisplay.textContent = formatHourDisplay(hour);
        updateHourTrackFill();
    });

    hourSlider.addEventListener('change', debounce((e) => {
        updateMapView();
    }, 300));

    // Initialize hour track fill
    updateHourTrackFill();

    // Year range filters
    const yearMin = document.getElementById('year-min');
    const yearMax = document.getElementById('year-max');
    const yearMinDisplay = document.getElementById('year-min-display');
    const yearMaxDisplay = document.getElementById('year-max-display');
    const yearRangeDisplay = document.getElementById('year-range-display');
    const yearMinTrackFill = document.getElementById('year-min-track-fill');
    const yearMaxTrackFill = document.getElementById('year-max-track-fill');

    // Update year track fills
    const updateYearTrackFills = () => {
        const minValue = parseInt(yearMin.value);
        const maxValue = parseInt(yearMax.value);
        const minRange = parseInt(yearMin.min);
        const maxRange = parseInt(yearMin.max);

        const minPercentage = ((minValue - minRange) / (maxRange - minRange)) * 100;
        const maxPercentage = ((maxValue - minRange) / (maxRange - minRange)) * 100;

        yearMinTrackFill.style.width = `${minPercentage}%`;
        yearMaxTrackFill.style.width = `${maxPercentage}%`;
    };

    const updateYearDisplay = () => {
        const min = parseInt(yearMin.value);
        const max = parseInt(yearMax.value);

        // Ensure min <= max
        if (min > max) {
            yearMin.value = max;
            appData.currentFilters.yearMin = max;
        } else {
            appData.currentFilters.yearMin = min;
        }

        if (max < min) {
            yearMax.value = min;
            appData.currentFilters.yearMax = min;
        } else {
            appData.currentFilters.yearMax = max;
        }

        yearMinDisplay.textContent = appData.currentFilters.yearMin;
        yearMaxDisplay.textContent = appData.currentFilters.yearMax;
        yearRangeDisplay.textContent = `${appData.currentFilters.yearMin} - ${appData.currentFilters.yearMax}`;

        updateYearTrackFills();
    };

    yearMin.addEventListener('input', (e) => {
        updateYearDisplay();
    });

    yearMax.addEventListener('input', (e) => {
        updateYearDisplay();
    });

    yearMin.addEventListener('change', debounce(() => {
        updateMapView();
    }, 300));

    yearMax.addEventListener('change', debounce(() => {
        updateMapView();
    }, 300));

    // Initialize year track fills
    updateYearTrackFills();

    // Severity filter
    const severityFilter = document.getElementById('severity-filter');
    severityFilter.addEventListener('change', (e) => {
        appData.currentFilters.severity = e.target.value;
        updateMapView();
    });

    // Victim type filters
    document.getElementById('filter-pedestrian').addEventListener('change', (e) => {
        appData.currentFilters.pedestrian = e.target.checked;
        updateMapView();
    });

    document.getElementById('filter-cyclist').addEventListener('change', (e) => {
        appData.currentFilters.cyclist = e.target.checked;
        updateMapView();
    });

    document.getElementById('filter-motorist').addEventListener('change', (e) => {
        appData.currentFilters.motorist = e.target.checked;
        updateMapView();
    });

    // Reset all filters
    document.getElementById('reset-all-filters').addEventListener('click', () => {
        appData.currentFilters = {
            hour: null,
            yearMin: 2012,
            yearMax: 2025,
            severity: 'all',
            pedestrian: true,
            cyclist: true,
            motorist: true
        };

        // Update UI
        hourSlider.value = 0;
        hourDisplay.textContent = 'All Hours';
        updateHourTrackFill();

        yearMin.value = 2012;
        yearMax.value = 2025;
        yearMinDisplay.textContent = '2012';
        yearMaxDisplay.textContent = '2025';
        yearRangeDisplay.textContent = '2012 - 2025';
        updateYearTrackFills();

        severityFilter.value = 'all';
        document.getElementById('filter-pedestrian').checked = true;
        document.getElementById('filter-cyclist').checked = true;
        document.getElementById('filter-motorist').checked = true;

        updateMapView();
    });

    // Reset individual filters
    document.querySelectorAll('.reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterType = e.target.dataset.filter;

            if (filterType === 'hour') {
                appData.currentFilters.hour = null;
                hourSlider.value = 0;
                hourDisplay.textContent = 'All Hours';
                updateHourTrackFill();
            } else if (filterType === 'year') {
                appData.currentFilters.yearMin = 2012;
                appData.currentFilters.yearMax = 2025;
                yearMin.value = 2012;
                yearMax.value = 2025;
                yearMinDisplay.textContent = '2012';
                yearMaxDisplay.textContent = '2025';
                yearRangeDisplay.textContent = '2012 - 2025';
                updateYearTrackFills();
            }

            updateMapView();
        });
    });
}

function updateMapView() {
    // Apply filters
    const filteredData = applyFilters(appData.rawData, appData.currentFilters);
    appData.filteredData = filteredData;

    console.log(`Filtered to ${filteredData.length} records`);

    // Re-aggregate hexbins with filtered data
    currentHexbins = aggregateByHexbin(filteredData);

    // Render hexbins
    renderHexbins();

    // Update legend
    updateLegend();
}

function renderHexbins() {
    // Clear existing layer
    hexLayer.clearLayers();

    if (currentHexbins.length === 0) {
        console.warn('No hexbins to render');
        return;
    }

    // Find min/max for color scaling
    const counts = currentHexbins.map(h => h.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // Create hexagon polygons
    currentHexbins.forEach(hexbin => {
        // Create hexagon points
        const hexPoints = getHexagonPoints(hexbin.y, hexbin.x, CONFIG.HEXBIN_RADIUS);

        // Get color based on count
        const color = getColorFromScale(
            hexbin.count,
            minCount,
            maxCount,
            CONFIG.COLOR_SCALES.density
        );

        // Create polygon
        const polygon = L.polygon(hexPoints, {
            color: color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 1,
            opacity: 0.8
        });

        // Add tooltip
        const tooltipContent = `
            <strong>${hexbin.count} crashes</strong><br>
            Injuries: ${hexbin.injured}<br>
            Fatalities: ${hexbin.killed}<br>
            Top factor: ${hexbin.topFactor}
        `;

        polygon.bindTooltip(tooltipContent, {
            sticky: true
        });

        // Add click handler
        polygon.on('click', () => {
            showHexDetails(hexbin);
        });

        // Add to layer
        polygon.addTo(hexLayer);
    });

    console.log(`Rendered ${currentHexbins.length} hexbins`);
}

function getHexagonPoints(lat, lon, radius) {
    // Create hexagon vertices
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const y = lat + radius * Math.sin(angle);
        const x = lon + radius * Math.cos(angle);
        points.push([y, x]);
    }
    return points;
}

function updateLegend() {
    const legendScale = document.getElementById('legend-scale');

    if (currentHexbins.length === 0) {
        legendScale.innerHTML = '<p style="font-size: 0.8rem; color: #7f8c8d;">No data</p>';
        return;
    }

    const counts = currentHexbins.map(h => h.count);
    const maxCount = Math.max(...counts);

    // Create legend items
    const legendHTML = CONFIG.COLOR_SCALES.density.slice().reverse().map((color, i) => {
        const value = Math.round(maxCount * (8 - i) / 8);
        return `
            <div class="legend-item">
                <div class="legend-color" style="background: ${color};"></div>
                <span>${value}+ crashes</span>
            </div>
        `;
    }).join('');

    legendScale.innerHTML = legendHTML;
}

function showHexDetails(hexbin) {
    const panel = document.getElementById('hex-detail-panel');
    const content = document.getElementById('hex-details-content');

    // Build detail content
    const html = `
        <div class="detail-stat">
            <span class="detail-label">Total Crashes</span>
            <span class="detail-value">${hexbin.count}</span>
        </div>
        <div class="detail-stat">
            <span class="detail-label">Injuries</span>
            <span class="detail-value">${hexbin.injured}</span>
        </div>
        <div class="detail-stat">
            <span class="detail-label">Fatalities</span>
            <span class="detail-value">${hexbin.killed}</span>
        </div>
        <div class="detail-stat">
            <span class="detail-label">Average Severity</span>
            <span class="detail-value">${hexbin.avgSeverity.toFixed(2)}</span>
        </div>
        <div class="detail-stat">
            <span class="detail-label">Top Contributing Factor</span>
            <span class="detail-value">${hexbin.topFactor}</span>
        </div>
    `;

    content.innerHTML = html;
    panel.classList.remove('hidden');

    // Close button
    panel.querySelector('.close-btn').onclick = () => {
        panel.classList.add('hidden');
    };
}

console.log('Map-view.js loaded');
