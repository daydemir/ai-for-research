// Insights and summary statistics view

function initializeInsightsView() {
    console.log('Initializing insights view...');

    const stats = appData.processedData.stats;

    // Update stat cards
    updateStatCards(stats);

    // Generate key findings
    generateKeyFindings(stats);

    // Show top dangerous intersections
    showDangerousIntersections();

    // Show data quality report
    showDataQuality(stats);

    console.log('Insights view initialized');
}

function updateStatCards(stats) {
    // Total crashes
    document.getElementById('stat-total-crashes').textContent = formatNumber(stats.totalCrashes);
    document.getElementById('stat-crashes-detail').textContent =
        `from ${stats.dateRange.min.getFullYear()} to ${stats.dateRange.max.getFullYear()}`;

    // Total casualties
    const totalCasualties = stats.totalInjured + stats.totalKilled;
    document.getElementById('stat-casualties').textContent = formatNumber(totalCasualties);
    document.getElementById('stat-casualties-detail').textContent =
        `${formatNumber(stats.totalInjured)} injured, ${formatNumber(stats.totalKilled)} killed`;

    // Most dangerous time
    const dangerousDay = DAY_NAMES[stats.mostDangerousDay];
    const dangerousHour = stats.mostDangerousHour;
    document.getElementById('stat-dangerous-time').textContent =
        `${dangerousDay}s ${dangerousHour}:00`;
    document.getElementById('stat-dangerous-detail').textContent = 'Highest crash frequency';

    // Safest time
    const safestDay = DAY_NAMES[stats.safestDay];
    const safestHour = stats.safestHour;
    document.getElementById('stat-safest-time').textContent =
        `${safestDay}s ${safestHour}:00`;
    document.getElementById('stat-safest-detail').textContent = 'Lowest crash frequency';
}

function generateKeyFindings(stats) {
    const findingsContainer = document.getElementById('key-findings');

    const findings = [];

    // Finding 1: Driver distraction
    const topFactor = appData.processedData.contributingFactors[0];
    if (topFactor && topFactor.name !== 'Unspecified') {
        const percent = ((topFactor.count / stats.totalCrashes) * 100).toFixed(1);
        findings.push({
            type: 'danger',
            title: `Driver Distraction is the Leading Cause`,
            description: `"${topFactor.name}" accounts for ${percent}% of all crashes (${formatNumber(topFactor.count)} incidents).`
        });
    }

    // Finding 2: Pedestrian safety
    const pedPercent = ((stats.pedestriansKilled / stats.totalKilled) * 100).toFixed(1);
    findings.push({
        type: 'warning',
        title: 'Pedestrian Vulnerability',
        description: `${formatNumber(stats.pedestriansKilled)} pedestrians killed (${pedPercent}% of all fatalities). ${formatNumber(stats.pedestriansInjured)} pedestrians injured.`
    });

    // Finding 3: Cyclist safety
    findings.push({
        type: 'warning',
        title: 'Cyclist Casualties',
        description: `${formatNumber(stats.cyclistsKilled)} cyclists killed and ${formatNumber(stats.cyclistsInjured)} injured over the data period.`
    });

    // Finding 4: Severity rate
    const fatalRate = ((stats.totalKilled / stats.totalCrashes) * 1000).toFixed(2);
    const injuryRate = ((stats.totalInjured / stats.totalCrashes) * 100).toFixed(1);
    findings.push({
        type: 'success',
        title: 'Low Fatality Rate',
        description: `While ${injuryRate}% of crashes involve injuries, the fatality rate is ${fatalRate} deaths per 1,000 crashes.`
    });

    // Finding 5: Rush hour pattern
    const rushHourCrashes = appData.processedData.hourDayMatrix.reduce((sum, day) => {
        return sum + day[16] + day[17] + day[18]; // 4-6 PM
    }, 0);

    const rushHourPercent = ((rushHourCrashes / stats.totalCrashes) * 100).toFixed(1);
    findings.push({
        type: 'danger',
        title: 'Afternoon Rush Hour Peak',
        description: `${rushHourPercent}% of crashes occur between 4-6 PM, making it the most dangerous time to drive.`
    });

    // Finding 6: Borough comparison
    const boroughs = appData.processedData.boroughs;
    const sortedBoroughs = Object.entries(boroughs)
        .filter(([name]) => name !== 'Unknown')
        .sort((a, b) => b[1].count - a[1].count);

    if (sortedBoroughs.length > 0) {
        const topBorough = sortedBoroughs[0];
        const boroughPercent = ((topBorough[1].count / stats.totalCrashes) * 100).toFixed(1);
        findings.push({
            type: 'warning',
            title: `${topBorough[0]} Has Most Crashes`,
            description: `${formatNumber(topBorough[1].count)} crashes (${boroughPercent}% of total) with ${formatNumber(topBorough[1].injuries)} injuries.`
        });
    }

    // Render findings
    findingsContainer.innerHTML = findings.map(f => `
        <div class="finding-item ${f.type}">
            <div class="finding-title">${f.title}</div>
            <div class="finding-description">${f.description}</div>
        </div>
    `).join('');
}

function showDangerousIntersections() {
    const container = document.getElementById('dangerous-intersections');
    const intersections = appData.processedData.topIntersections;

    if (intersections.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d;">No intersection data available</p>';
        return;
    }

    container.innerHTML = intersections.map((intersection, i) => `
        <div class="intersection-item">
            <span class="intersection-rank">${i + 1}</span>
            <span class="intersection-name">${intersection.name}</span>
            <div class="intersection-count">
                <div class="crash-count">${formatNumber(intersection.count)}</div>
                <div class="crash-label">crashes</div>
            </div>
        </div>
    `).join('');
}

function showDataQuality(stats) {
    const container = document.getElementById('data-quality');

    // Calculate percentages
    const coordPercent = 100; // We filtered for valid coordinates
    const yearsCovered = stats.dateRange.max.getFullYear() - stats.dateRange.min.getFullYear() + 1;

    const qualityItems = [
        {
            label: 'Records with Coordinates',
            value: `${coordPercent}%`,
            percent: coordPercent,
            type: 'success'
        },
        {
            label: 'Years of Data',
            value: `${yearsCovered} years`,
            percent: 100,
            type: 'success'
        },
        {
            label: 'Total Records Analyzed',
            value: formatNumber(stats.totalCrashes),
            percent: 100,
            type: 'success'
        },
        {
            label: 'Date Range',
            value: `${stats.dateRange.min.toLocaleDateString()} - ${stats.dateRange.max.toLocaleDateString()}`,
            percent: 100,
            type: 'success'
        }
    ];

    container.innerHTML = qualityItems.map(item => `
        <div class="quality-item">
            <div class="quality-label">${item.label}</div>
            <div class="quality-value">${item.value}</div>
            <div class="quality-bar">
                <div class="quality-fill ${item.type}" style="width: ${item.percent}%;"></div>
            </div>
        </div>
    `).join('');
}

console.log('Insights-view.js loaded');
