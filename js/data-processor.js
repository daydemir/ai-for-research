// Data aggregation and processing functions

function aggregateByHexbin(data) {
    console.log('    - Creating hexbin aggregation for', data.length, 'records');
    console.log('    - Hexbin radius:', CONFIG.HEXBIN_RADIUS);

    // Check if d3.hexbin exists
    if (typeof d3 === 'undefined') {
        throw new Error('d3 is not defined! Library may not have loaded.');
    }

    if (typeof d3.hexbin === 'undefined') {
        throw new Error('d3.hexbin is not defined! Check library version.');
    }

    console.log('    - d3.hexbin function:', typeof d3.hexbin);

    // Use d3-hexbin to create hexagonal bins
    const hexbin = d3.hexbin()
        .radius(CONFIG.HEXBIN_RADIUS)
        .x(d => d.lon)
        .y(d => d.lat);

    console.log('    - Hexbin function created, executing...');
    const bins = hexbin(data);
    console.log('    - Raw bins created:', bins.length);

    // Enrich bins with statistics
    return bins.map(bin => {
        const totalKilled = bin.reduce((sum, d) => sum + d.killed, 0);
        const totalInjured = bin.reduce((sum, d) => sum + d.injured, 0);
        const severityScore = bin.reduce((sum, d) => sum + d.severityScore, 0);

        // Count contributing factors
        const factors = {};
        bin.forEach(d => {
            factors[d.primaryFactor] = (factors[d.primaryFactor] || 0) + 1;
        });

        const topFactor = Object.entries(factors)
            .sort((a, b) => b[1] - a[1])[0];

        return {
            x: bin.x,
            y: bin.y,
            count: bin.length,
            killed: totalKilled,
            injured: totalInjured,
            severityScore: severityScore,
            avgSeverity: severityScore / bin.length,
            topFactor: topFactor ? topFactor[0] : 'Unknown',
            crashes: bin
        };
    });
}

function aggregateByHourAndDay(data) {
    // Create 7x24 matrix (day x hour)
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));

    data.forEach(record => {
        if (record.dayOfWeek !== null && record.hour !== null) {
            matrix[record.dayOfWeek][record.hour]++;
        }
    });

    return matrix;
}

function aggregateByMonth(data) {
    // Aggregate by month across all years
    const monthly = Array(12).fill(null).map(() => ({
        total: 0,
        injuries: 0,
        fatalities: 0
    }));

    data.forEach(record => {
        if (record.month !== null) {
            monthly[record.month].total++;
            if (record.injured > 0) monthly[record.month].injuries++;
            if (record.killed > 0) monthly[record.month].fatalities++;
        }
    });

    return monthly;
}

function aggregateByFactor(data) {
    const factors = {};

    data.forEach(record => {
        const factor = record.primaryFactor;
        if (!factors[factor]) {
            factors[factor] = {
                count: 0,
                injuries: 0,
                fatalities: 0,
                severityScore: 0
            };
        }

        factors[factor].count++;
        factors[factor].injuries += record.injured;
        factors[factor].fatalities += record.killed;
        factors[factor].severityScore += record.severityScore;
    });

    // Convert to array and sort
    return Object.entries(factors)
        .map(([name, stats]) => ({
            name,
            ...stats
        }))
        .sort((a, b) => b.count - a.count);
}

function aggregateByVehicle(data) {
    const vehicles = {};

    data.forEach(record => {
        const vehicle = record.primaryVehicle;
        if (!vehicles[vehicle]) {
            vehicles[vehicle] = {
                count: 0,
                injuries: 0,
                fatalities: 0
            };
        }

        vehicles[vehicle].count++;
        vehicles[vehicle].injuries += record.injured;
        vehicles[vehicle].fatalities += record.killed;
    });

    // Convert to array and sort
    return Object.entries(vehicles)
        .map(([name, stats]) => ({
            name,
            ...stats
        }))
        .sort((a, b) => b.count - a.count);
}

function aggregateByBorough(data) {
    const boroughs = {};

    data.forEach(record => {
        const borough = record.borough || 'Unknown';
        if (!boroughs[borough]) {
            boroughs[borough] = {
                count: 0,
                injuries: 0,
                fatalities: 0,
                severityScore: 0
            };
        }

        boroughs[borough].count++;
        boroughs[borough].injuries += record.injured;
        boroughs[borough].fatalities += record.killed;
        boroughs[borough].severityScore += record.severityScore;
    });

    return boroughs;
}

function aggregateBySeverity(data) {
    const severity = {
        property: 0,
        injury: 0,
        fatal: 0
    };

    data.forEach(record => {
        severity[record.severityType]++;
    });

    return severity;
}

function findTopIntersections(data) {
    const intersections = {};

    data.forEach(record => {
        // Create intersection key from street names
        if (record.onStreet && record.crossStreet) {
            const streets = [record.onStreet, record.crossStreet].sort();
            const key = `${streets[0]} & ${streets[1]}`;

            if (!intersections[key]) {
                intersections[key] = {
                    name: key,
                    count: 0,
                    injuries: 0,
                    fatalities: 0
                };
            }

            intersections[key].count++;
            intersections[key].injuries += record.injured;
            intersections[key].fatalities += record.killed;
        }
    });

    // Convert to array and get top 10
    return Object.values(intersections)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

function calculateSummaryStats(data) {
    const stats = {
        totalCrashes: data.length,
        totalInjured: 0,
        totalKilled: 0,
        pedestriansInjured: 0,
        pedestriansKilled: 0,
        cyclistsInjured: 0,
        cyclistsKilled: 0,
        motoristsInjured: 0,
        motoristsKilled: 0,
        withCoordinates: data.length,
        dateRange: {
            min: null,
            max: null
        }
    };

    let hourCounts = Array(24).fill(0);
    let dayCounts = Array(7).fill(0);

    data.forEach(record => {
        stats.totalInjured += record.injured;
        stats.totalKilled += record.killed;
        stats.pedestriansInjured += record.pedestriansInjured;
        stats.pedestriansKilled += record.pedestriansKilled;
        stats.cyclistsInjured += record.cyclistsInjured;
        stats.cyclistsKilled += record.cyclistsKilled;
        stats.motoristsInjured += record.motoristsInjured;
        stats.motoristsKilled += record.motoristsKilled;

        // Track date range
        if (!stats.dateRange.min || record.date < stats.dateRange.min) {
            stats.dateRange.min = record.date;
        }
        if (!stats.dateRange.max || record.date > stats.dateRange.max) {
            stats.dateRange.max = record.date;
        }

        // Count by hour and day
        if (record.hour !== null) hourCounts[record.hour]++;
        if (record.dayOfWeek !== null) dayCounts[record.dayOfWeek]++;
    });

    // Find most/least dangerous times
    const maxHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    const minHourIndex = hourCounts.indexOf(Math.min(...hourCounts));
    const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const minDayIndex = dayCounts.indexOf(Math.min(...dayCounts));

    stats.mostDangerousHour = maxHourIndex;
    stats.safestHour = minHourIndex;
    stats.mostDangerousDay = maxDayIndex;
    stats.safestDay = minDayIndex;

    return stats;
}

function applyFilters(data, filters) {
    return data.filter(record => {
        // Hour filter
        if (filters.hour !== null && record.hour !== filters.hour) {
            return false;
        }

        // Year range filter
        if (record.year < filters.yearMin || record.year > filters.yearMax) {
            return false;
        }

        // Severity filter
        if (filters.severity !== 'all') {
            if (filters.severity === 'injury' && record.severityType !== 'injury') {
                return false;
            }
            if (filters.severity === 'fatal' && record.severityType !== 'fatal') {
                return false;
            }
            if (filters.severity === 'property' && record.severityType !== 'property') {
                return false;
            }
        }

        // Victim type filters
        if (!filters.pedestrian && record.hasPedestrian) {
            return false;
        }
        if (!filters.cyclist && record.hasCyclist) {
            return false;
        }
        if (!filters.motorist && record.hasMotorist) {
            return false;
        }

        return true;
    });
}

console.log('Data-processor.js loaded');
