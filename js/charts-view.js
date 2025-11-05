// Charts view with interactive visualizations

let charts = {};

function initializeChartsView() {
    console.log('Initializing charts view...');

    createTemporalHeatmap();
    createSeverityChart();
    createFactorsChart();
    createMonthlyTrends();
    createBoroughChart();
    createVehicleChart();

    console.log('Charts view initialized');
}

function createTemporalHeatmap() {
    const ctx = document.getElementById('temporal-heatmap').getContext('2d');

    const matrix = appData.processedData.hourDayMatrix;

    // Flatten matrix for Chart.js
    const data = [];
    matrix.forEach((dayData, day) => {
        dayData.forEach((count, hour) => {
            data.push({
                x: hour,
                y: day,
                v: count
            });
        });
    });

    // Find max value for color scaling
    const maxValue = Math.max(...data.map(d => d.v));

    charts.temporal = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Crashes',
                data: data,
                backgroundColor: data.map(d => {
                    const normalized = d.v / maxValue;
                    const colorIndex = Math.min(
                        Math.floor(normalized * CONFIG.COLOR_SCALES.density.length),
                        CONFIG.COLOR_SCALES.density.length - 1
                    );
                    return CONFIG.COLOR_SCALES.density[colorIndex];
                }),
                pointRadius: 10,
                pointStyle: 'rect'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const day = DAY_NAMES[context.parsed.y];
                            const hour = context.parsed.x;
                            const count = context.raw.v;
                            return `${day} ${hour}:00 - ${formatNumber(count)} crashes`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 23,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value + ':00';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    max: 6,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return DAY_NAMES_SHORT[value];
                        }
                    },
                    title: {
                        display: true,
                        text: 'Day of Week'
                    }
                }
            }
        }
    });
}

function createSeverityChart() {
    const ctx = document.getElementById('severity-chart').getContext('2d');

    const severity = appData.processedData.severity;

    charts.severity = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Property Damage Only', 'Injuries', 'Fatalities'],
            datasets: [{
                data: [severity.property, severity.injury, severity.fatal],
                backgroundColor: [
                    '#95a5a6',
                    '#f39c12',
                    '#e74c3c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${label}: ${formatNumber(value)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createFactorsChart() {
    const ctx = document.getElementById('factors-chart').getContext('2d');

    const factors = appData.processedData.contributingFactors
        .filter(f => f.name !== 'Unspecified')
        .slice(0, 10);

    charts.factors = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: factors.map(f => f.name.length > 30 ? f.name.substring(0, 27) + '...' : f.name),
            datasets: [{
                label: 'Number of Crashes',
                data: factors.map(f => f.count),
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const factor = factors[context.dataIndex];
                            return [
                                `Crashes: ${formatNumber(factor.count)}`,
                                `Injuries: ${formatNumber(factor.injuries)}`,
                                `Fatalities: ${formatNumber(factor.fatalities)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createMonthlyTrends() {
    const ctx = document.getElementById('monthly-trends').getContext('2d');

    const monthly = appData.processedData.monthlyTrends;

    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTH_NAMES,
            datasets: [
                {
                    label: 'Total Crashes',
                    data: monthly.map(m => m.total),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'With Injuries',
                    data: monthly.map(m => m.injuries),
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'With Fatalities',
                    data: monthly.map(m => m.fatalities),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createBoroughChart() {
    const ctx = document.getElementById('borough-chart').getContext('2d');

    const boroughs = appData.processedData.boroughs;
    const boroughNames = Object.keys(boroughs).filter(b => b !== 'Unknown');

    charts.borough = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: boroughNames,
            datasets: [
                {
                    label: 'Total Crashes',
                    data: boroughNames.map(b => boroughs[b].count),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                },
                {
                    label: 'Injuries',
                    data: boroughNames.map(b => boroughs[b].injuries),
                    backgroundColor: '#f39c12',
                    borderColor: '#e67e22',
                    borderWidth: 1
                },
                {
                    label: 'Fatalities',
                    data: boroughNames.map(b => boroughs[b].fatalities),
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function createVehicleChart() {
    const ctx = document.getElementById('vehicle-chart').getContext('2d');

    const vehicles = appData.processedData.vehicleTypes
        .filter(v => v.name !== 'Unknown' && v.name !== 'Other')
        .slice(0, 10);

    charts.vehicle = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: vehicles.map(v => v.name.length > 25 ? v.name.substring(0, 22) + '...' : v.name),
            datasets: [{
                label: 'Number of Crashes',
                data: vehicles.map(v => v.count),
                backgroundColor: '#9b59b6',
                borderColor: '#8e44ad',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const vehicle = vehicles[context.dataIndex];
                            return [
                                `Crashes: ${formatNumber(vehicle.count)}`,
                                `Injuries: ${formatNumber(vehicle.injuries)}`,
                                `Fatalities: ${formatNumber(vehicle.fatalities)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

console.log('Charts-view.js loaded');
