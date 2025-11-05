// Utility functions for NYC Crash Data Visualization

const CONFIG = {
    CSV_PATH: './Motor_Vehicle_Collisions_-_Crashes.csv',
    SAMPLING_RATE: 10, // Load every 10th record for performance
    CACHE_KEY: 'nyc_crash_data_v1',
    CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    SEVERITY_WEIGHTS: {
        fatality: 10,
        injury: 1
    },
    HEXBIN_RADIUS: 0.002, // ~200m in lat/lon degrees
    COLOR_SCALES: {
        density: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
        severity: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c']
    }
};

// Global data store
let appData = {
    rawData: [],
    processedData: null,
    filteredData: [],
    currentFilters: {
        hour: null,
        yearMin: 2012,
        yearMax: 2025,
        severity: 'all',
        pedestrian: true,
        cyclist: true,
        motorist: true
    }
};

// Date parsing utilities
function parseDate(dateStr) {
    // Parse MM/DD/YYYY format
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    return new Date(year, month, day);
}

function parseTime(timeStr) {
    // Parse HH:MM format
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;

    return parseInt(parts[0]); // Return hour (0-23)
}

function getDayOfWeek(date) {
    if (!date) return null;
    return date.getDay(); // 0 = Sunday, 6 = Saturday
}

function getMonth(date) {
    if (!date) return null;
    return date.getMonth(); // 0-11
}

function getYear(date) {
    if (!date) return null;
    return date.getFullYear();
}

// Severity calculations
function calculateSeverityScore(record) {
    const killed = parseInt(record['NUMBER OF PERSONS KILLED'] || 0);
    const injured = parseInt(record['NUMBER OF PERSONS INJURED'] || 0);

    return (killed * CONFIG.SEVERITY_WEIGHTS.fatality) +
           (injured * CONFIG.SEVERITY_WEIGHTS.injury);
}

function hasPedestrianInvolvement(record) {
    const injured = parseInt(record['NUMBER OF PEDESTRIANS INJURED'] || 0);
    const killed = parseInt(record['NUMBER OF PEDESTRIANS KILLED'] || 0);
    return injured > 0 || killed > 0;
}

function hasCyclistInvolvement(record) {
    const injured = parseInt(record['NUMBER OF CYCLIST INJURED'] || 0);
    const killed = parseInt(record['NUMBER OF CYCLIST KILLED'] || 0);
    return injured > 0 || killed > 0;
}

function hasMotoristInvolvement(record) {
    const injured = parseInt(record['NUMBER OF MOTORIST INJURED'] || 0);
    const killed = parseInt(record['NUMBER OF MOTORIST KILLED'] || 0);
    return injured > 0 || killed > 0;
}

function getSeverityType(record) {
    const killed = parseInt(record['NUMBER OF PERSONS KILLED'] || 0);
    const injured = parseInt(record['NUMBER OF PERSONS INJURED'] || 0);

    if (killed > 0) return 'fatal';
    if (injured > 0) return 'injury';
    return 'property';
}

// Data validation
function isValidRecord(record) {
    // Must have coordinates
    const lat = parseFloat(record.LATITUDE);
    const lon = parseFloat(record.LONGITUDE);

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) return false;

    // Must be in NYC area (roughly)
    if (lat < 40.4 || lat > 41.0 || lon < -74.3 || lon > -73.6) return false;

    // Must have date and time
    if (!record['CRASH DATE'] || !record['CRASH TIME']) return false;

    return true;
}

// Get primary contributing factor (first non-"Unspecified")
function getPrimaryFactor(record) {
    for (let i = 1; i <= 5; i++) {
        const factor = record[`CONTRIBUTING FACTOR VEHICLE ${i}`];
        if (factor &&
            factor !== 'Unspecified' &&
            factor !== '' &&
            factor.toLowerCase() !== 'unspecified') {
            return factor;
        }
    }
    return 'Unspecified';
}

// Get primary vehicle type
function getPrimaryVehicle(record) {
    const vehicle = record['VEHICLE TYPE CODE 1'];
    if (!vehicle || vehicle === '' || vehicle.toLowerCase() === 'unknown') {
        return 'Unknown';
    }
    return vehicle;
}

// Format numbers with commas
function formatNumber(num) {
    return num.toLocaleString('en-US');
}

// Format percentages
function formatPercent(value, total) {
    const percent = (value / total * 100).toFixed(1);
    return `${percent}%`;
}

// Get color from scale
function getColorFromScale(value, min, max, scale) {
    if (value === 0) return scale[0];

    const normalized = (value - min) / (max - min);
    const index = Math.min(Math.floor(normalized * scale.length), scale.length - 1);
    return scale[index];
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local storage utilities
function saveToCache(key, data) {
    try {
        const cacheItem = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));
        return true;
    } catch (e) {
        console.warn('Failed to save to cache:', e);
        return false;
    }
}

function loadFromCache(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const cacheItem = JSON.parse(item);

        // Check if expired
        if (Date.now() - cacheItem.timestamp > CONFIG.CACHE_EXPIRY) {
            localStorage.removeItem(key);
            return null;
        }

        return cacheItem.data;
    } catch (e) {
        console.warn('Failed to load from cache:', e);
        return null;
    }
}

// Update loading UI
function updateLoadingProgress(percent, message) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const loadingMessage = document.querySelector('.loading-message');

    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }

    if (progressText) {
        progressText.textContent = `${Math.round(percent)}%`;
    }

    if (loadingMessage && message) {
        loadingMessage.textContent = message;
    }
}

function hideLoadingScreen() {
    console.log('hideLoadingScreen() called');
    const loadingScreen = document.getElementById('loading-screen');
    console.log('Loading screen element:', loadingScreen);

    if (loadingScreen) {
        console.log('Before hide - classes:', loadingScreen.className);
        console.log('Before hide - display:', window.getComputedStyle(loadingScreen).display);

        loadingScreen.classList.add('hidden');

        console.log('After hide - classes:', loadingScreen.className);
        console.log('After hide - display:', window.getComputedStyle(loadingScreen).display);
        console.log('✓ Loading screen hidden successfully');
    } else {
        console.error('ERROR: Loading screen element not found!');
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

// Day of week names
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Get time period label
function getTimePeriodLabel(hour) {
    if (hour < 6) return 'Late Night (12am-6am)';
    if (hour < 12) return 'Morning (6am-12pm)';
    if (hour < 17) return 'Afternoon (12pm-5pm)';
    if (hour < 21) return 'Evening (5pm-9pm)';
    return 'Night (9pm-12am)';
}

console.log('Utils.js loaded');
