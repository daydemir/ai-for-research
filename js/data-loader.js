// Data loading and CSV parsing

function loadAndProcessData() {
    console.log('=== Starting Data Load ===');
    console.log('Config:', CONFIG);

    // Check if required libraries are loaded
    if (typeof Papa === 'undefined') {
        console.error('ERROR: PapaParse library not loaded!');
        updateLoadingProgress(0, 'Error: PapaParse library missing');
        return;
    }

    if (typeof d3 === 'undefined') {
        console.error('ERROR: d3-hexbin library not loaded!');
        updateLoadingProgress(0, 'Error: d3-hexbin library missing');
        return;
    }

    console.log('✓ PapaParse loaded:', typeof Papa);
    console.log('✓ d3-hexbin loaded:', typeof d3);
    console.log('✓ d3.hexbin available:', typeof d3.hexbin);

    // Try to load from cache first
    updateLoadingProgress(0, 'Checking cache...');
    console.log('Checking localStorage cache...');

    const cachedData = loadFromCache(CONFIG.CACHE_KEY);

    if (cachedData) {
        console.log('✓ Cache found! Loading from cache...');
        console.log('  - Raw data records:', cachedData.rawData.length);
        updateLoadingProgress(50, 'Loading from cache...');

        appData.rawData = cachedData.rawData;
        appData.processedData = cachedData.processedData;

        setTimeout(() => {
            initializeVisualization();
        }, 500);

        return;
    }

    // Load from CSV
    console.log('No cache found. Loading CSV file from:', CONFIG.CSV_PATH);
    updateLoadingProgress(5, 'Parsing CSV file...');

    let rowCount = 0;
    let validRecords = [];
    let samplingCounter = 0;

    Papa.parse(CONFIG.CSV_PATH, {
        download: true,
        header: true,
        step: function(row, parser) {
            rowCount++;

            // Sample every Nth record for performance
            samplingCounter++;
            if (samplingCounter < CONFIG.SAMPLING_RATE) {
                return;
            }
            samplingCounter = 0;

            // Validate and filter
            if (isValidRecord(row.data)) {
                // Enhance record with computed fields
                const enhancedRecord = enhanceRecord(row.data);
                if (enhancedRecord) {
                    validRecords.push(enhancedRecord);
                }
            }

            // Update progress periodically
            if (rowCount % 50000 === 0) {
                const progress = Math.min(5 + (rowCount / 2200000) * 70, 75);
                updateLoadingProgress(progress, `Loaded ${formatNumber(rowCount)} records...`);
            }
        },
        complete: function(results) {
            console.log(`✓ CSV Parsing Complete!`);
            console.log(`  - Total rows parsed: ${formatNumber(rowCount)}`);
            console.log(`  - Valid records kept: ${formatNumber(validRecords.length)}`);
            console.log(`  - Sampling rate: 1 in ${CONFIG.SAMPLING_RATE}`);

            updateLoadingProgress(80, 'Processing data...');

            appData.rawData = validRecords;

            // Process data
            console.log('Starting data processing...');
            setTimeout(() => {
                processData();
            }, 100);
        },
        error: function(error) {
            console.error('ERROR parsing CSV:', error);
            console.error('Error details:', {
                message: error.message,
                type: error.type,
                code: error.code
            });
            updateLoadingProgress(0, 'Error loading data. Please refresh.');
            alert('Error loading CSV file. Check console for details.');
        }
    });
}

function enhanceRecord(record) {
    try {
        const date = parseDate(record['CRASH DATE']);
        if (!date) return null;

        const hour = parseTime(record['CRASH TIME']);
        if (hour === null) return null;

        return {
            // Original data
            id: record.COLLISION_ID,
            lat: parseFloat(record.LATITUDE),
            lon: parseFloat(record.LONGITUDE),
            borough: record.BOROUGH || 'Unknown',
            zip: record['ZIP CODE'] || '',
            onStreet: record['ON STREET NAME'] || '',
            crossStreet: record['CROSS STREET NAME'] || '',

            // Temporal
            date: date,
            hour: hour,
            dayOfWeek: getDayOfWeek(date),
            month: getMonth(date),
            year: getYear(date),

            // Casualties
            killed: parseInt(record['NUMBER OF PERSONS KILLED'] || 0),
            injured: parseInt(record['NUMBER OF PERSONS INJURED'] || 0),
            pedestriansKilled: parseInt(record['NUMBER OF PEDESTRIANS KILLED'] || 0),
            pedestriansInjured: parseInt(record['NUMBER OF PEDESTRIANS INJURED'] || 0),
            cyclistsKilled: parseInt(record['NUMBER OF CYCLIST KILLED'] || 0),
            cyclistsInjured: parseInt(record['NUMBER OF CYCLIST INJURED'] || 0),
            motoristsKilled: parseInt(record['NUMBER OF MOTORIST KILLED'] || 0),
            motoristsInjured: parseInt(record['NUMBER OF MOTORIST INJURED'] || 0),

            // Computed fields
            severityScore: calculateSeverityScore(record),
            severityType: getSeverityType(record),
            hasPedestrian: hasPedestrianInvolvement(record),
            hasCyclist: hasCyclistInvolvement(record),
            hasMotorist: hasMotoristInvolvement(record),
            primaryFactor: getPrimaryFactor(record),
            primaryVehicle: getPrimaryVehicle(record)
        };
    } catch (e) {
        console.warn('Error enhancing record:', e);
        return null;
    }
}

function processData() {
    console.log('=== Processing Data ===');
    updateLoadingProgress(85, 'Aggregating data...');

    try {
        console.log('Creating aggregations...');

        // Spatial aggregation for map
        console.log('  1/9 Aggregating hexbins...');
        const hexbins = aggregateByHexbin(appData.rawData);
        console.log(`    ✓ Created ${hexbins.length} hexbins`);

        // Temporal aggregations for charts
        console.log('  2/9 Aggregating by hour and day...');
        const hourDayMatrix = aggregateByHourAndDay(appData.rawData);
        console.log('    ✓ Hour/Day matrix created');

        console.log('  3/9 Aggregating monthly trends...');
        const monthlyTrends = aggregateByMonth(appData.rawData);
        console.log('    ✓ Monthly trends created');

        // Categorical aggregations
        console.log('  4/9 Aggregating contributing factors...');
        const contributingFactors = aggregateByFactor(appData.rawData);
        console.log(`    ✓ Found ${contributingFactors.length} factors`);

        console.log('  5/9 Aggregating vehicle types...');
        const vehicleTypes = aggregateByVehicle(appData.rawData);
        console.log(`    ✓ Found ${vehicleTypes.length} vehicle types`);

        console.log('  6/9 Aggregating by borough...');
        const boroughs = aggregateByBorough(appData.rawData);
        console.log(`    ✓ Found ${Object.keys(boroughs).length} boroughs`);

        console.log('  7/9 Aggregating severity...');
        const severity = aggregateBySeverity(appData.rawData);
        console.log('    ✓ Severity aggregation complete');

        // Top lists
        console.log('  8/9 Finding top intersections...');
        const topIntersections = findTopIntersections(appData.rawData);
        console.log(`    ✓ Found ${topIntersections.length} top intersections`);

        // Summary statistics
        console.log('  9/9 Calculating summary stats...');
        const stats = calculateSummaryStats(appData.rawData);
        console.log('    ✓ Stats calculated');

        const processedData = {
            hexbins,
            hourDayMatrix,
            monthlyTrends,
            contributingFactors,
            vehicleTypes,
            boroughs,
            severity,
            topIntersections,
            stats
        };

        appData.processedData = processedData;
        console.log('✓ All aggregations complete!');

        updateLoadingProgress(95, 'Caching data...');
        console.log('Saving to localStorage cache...');

        // Cache the processed data
        const cached = saveToCache(CONFIG.CACHE_KEY, {
            rawData: appData.rawData,
            processedData: processedData
        });

        if (cached) {
            console.log('✓ Data cached successfully');
        } else {
            console.warn('⚠ Failed to cache data (localStorage full?)');
        }

        updateLoadingProgress(100, 'Complete!');
        console.log('=== Data Processing Complete ===');

        setTimeout(() => {
            initializeVisualization();
        }, 500);

    } catch (e) {
        console.error('ERROR processing data:', e);
        console.error('Stack trace:', e.stack);
        console.error('Error occurred at:', {
            name: e.name,
            message: e.message,
            stack: e.stack
        });
        updateLoadingProgress(0, 'Error processing data. Check console.');
        alert('Error processing data. Check browser console for details.');
    }
}

function initializeVisualization() {
    console.log('=== Initializing Visualization ===');

    try {
        // Apply initial filters
        appData.filteredData = appData.rawData;
        console.log(`Filtered data initialized: ${appData.filteredData.length} records`);

        // Initialize all views
        console.log('Initializing Map View...');
        initializeMapView();
        console.log('✓ Map View initialized');

        console.log('Initializing Charts View...');
        initializeChartsView();
        console.log('✓ Charts View initialized');

        console.log('Initializing Insights View...');
        initializeInsightsView();
        console.log('✓ Insights View initialized');

        console.log('=== ✓ Visualization Ready! ===');
        console.log('You can now interact with the visualizations.');

    } catch (e) {
        console.error('ERROR initializing visualization:', e);
        console.error('Stack trace:', e.stack);
        console.error('Error name:', e.name);
        console.error('Error message:', e.message);
        alert('Error initializing visualization: ' + e.message + '\n\nCheck console for details.');
    } finally {
        // ALWAYS hide loading screen, even if there was an error
        console.log('Hiding loading screen (finally block)...');
        hideLoadingScreen();
    }
}

console.log('Data-loader.js loaded');
