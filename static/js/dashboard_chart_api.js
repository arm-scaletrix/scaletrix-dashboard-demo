/* ============================================================================
 * dashboard_chart_api.js
 *
 * API integration layer for chart data fetching and caching
 *
 * Responsibilities:
 * - Build API payloads from stored filter values (date range, devices, channels)
 * - Fetch chart data from backend API (https://gcl-service.run.app/api/v1/chart)
 * - Manage API request/response handling with error catching
 * - Coordinate page refresh (fetch all charts for current page)
 * - Map chart IDs to page context (Performance Overview vs Channel Analytics)
 * - Integration bridge between dashboard_layout.js and dashboard_charts.js
 * - Session storage management for active page and filters
 *
 * Dependencies:
 * - sessionStorage (for activePage, dateRange, filter_* values)
 * - window.renderChartFromAPI() from dashboard_charts.js
 * - window.clearDetailCharts() from dashboard_charts.js
 * - window.getStoredDateRange() from dashboard_layout.js
 * - Fetch API (ES6 Promise-based HTTP)
 *
 * Called by:
 * - dashboard_layout.js (on page load, date filter change, tab switch)
 * - User interactions (Apply Filters button, view change)
 *
 * Calls to:
 * - window.renderChartFromAPI() (pass response to chart rendering)
 * - window.clearDetailCharts() (cleanup before refresh)
 * - Fetch API to backend service
 *
 * API Endpoint:
 * - Base: https://gcl-service.run.app/api/v1/chart
 * - Pattern: POST /chart/{chartId}
 * - Payload: { dateRange, comparison, filters, timestamp }
 * - Response: { success, data, metadata, error }
 *
 * Version: 1.0
 * Author: Dashboard Development Team
 * Last Updated: 2025-12-11
 *
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * SECTION 1: API CONFIGURATION & CONSTANTS
 * ---------------------------------------------------------------------------*/

/**
 * 1.1: Backend API base URL
 * All chart data requests go to this endpoint
 * Pattern: {BASE_URL}/{chartId}
 * Example: https://gcl-service.run.app/api/v1/chart/kpi_revenue
 */
// const SCALEX_API_BASE = "http://localhost:8000/api/v1/chart";
const SCALEX_API_BASE = "https://scalex-ads-connector-ohkoqzgrzq-el.a.run.app/api/v1/chart";

/**
 * 1.2: Current active page (Performance Overview or Channel Analytics)
 * Read from sessionStorage on initialization
 * Updated when user switches tabs
 * Used to determine which charts to fetch
 */
let CURRENT_PAGE = sessionStorage.getItem("activePage") || "performance-overview";

/* ---------------------------------------------------------------------------
 * SECTION 2: FILTER MANAGEMENT
 * ---------------------------------------------------------------------------*/

/**
 * 2.1: Retrieve all stored filter values from session storage
 * Filters are persisted across page navigation
 * 
 * dateRange: Stored as JSON string with format:
 *   { dateRange: [start, end], comparison: bool, timestamp: ISO string }
 * 
 * Additional filters (for future implementation):
 *   - filter_devices: Device type filter (mobile, desktop, tablet)
 *   - filter_channels: Marketing channel filter (meta, google, linkedin)
 *   - filter_locations: Geographic location filter
 *
 * @returns {object} Filter object with all keys:
 *   {
 *     dateRange: [start, end] or null,
 *     comparison: boolean (compare to previous period),
 *     timestamp: ISO string (when filter was set),
 *     devices: string or null,
 *     channels: string or null,
 *     locations: string or null
 *   }
 */
function getStoredFilters() {
    // Read dateRange from sessionStorage (stored as JSON string by dashboard_layout.js)
    let stored = sessionStorage.getItem("dateRange");

    // Parse JSON, handle null/invalid cases
    let parsed = stored ? JSON.parse(stored) : null;

    // Return comprehensive filter object with all available filters
    return {
        dateRange: parsed?.dateRange || null,
        comparison: parsed?.comparison || false,
        timestamp: parsed?.timestamp || new Date().toISOString(),

        // Additional filters (currently placeholder, ready for implementation)
        devices: sessionStorage.getItem("filter_devices") || null,
        channels: sessionStorage.getItem("filter_channels") || null,
        locations: sessionStorage.getItem("filter_locations") || null
    };
}

/* ---------------------------------------------------------------------------
 * SECTION 3: API PAYLOAD CONSTRUCTION
 * ---------------------------------------------------------------------------*/

/**
 * 3.1: Build API request payload from stored filters
 * Matches backend API schema exactly
 * 
 * Payload structure:
 *   {
 *     dateRange: [start_date, end_date],  // from date picker
 *     comparison: boolean,                // compare to previous period
 *     filters: {
 *       devices: string | null,
 *       channels: string | null,
 *       locations: string | null
 *     },
 *     timestamp: ISO string               // when request was made
 *   }
 *
 * This payload is sent to backend for every chart request
 * Backend uses filters to segment data appropriately
 *
 * @returns {object} API payload ready for JSON.stringify()
 */
function buildPayload() {
    // Retrieve all stored filter values
    const f = getStoredFilters();

    // Construct payload object matching API schema
    return {
        dateRange: f.dateRange,
        comparison: f.comparison,
        filters: {
            devices: f.devices,
            channels: f.channels,
            locations: f.locations
        },
        timestamp: f.timestamp
    };
}

/* ---------------------------------------------------------------------------
 * SECTION 4: API REQUEST & RESPONSE HANDLING
 * ---------------------------------------------------------------------------*/

/**
 * 4.1: Fetch chart data from backend API
 * Generic function used for all chart requests
 * 
 * Request flow:
 *   1. Build payload from stored filters
 *   2. POST to {BASE}/{chartId}
 *   3. Check HTTP status
 *   4. Parse JSON response
 *   5. Return response object or error
 *
 * Error handling:
 *   - Network errors: Caught and returned as error object
 *   - HTTP errors (4xx, 5xx): Status code + response body logged
 *   - JSON parse errors: Caught and returned as error object
 *
 * @param {string} chartId – Backend chart identifier
 *   Examples: 'kpi_revenue', 'perf_funnel_by_channel', 'channel_snapshot_table'
 * @returns {Promise<object>} Response object:
 *   - On success: { success: true, data: {...}, metadata: {...} }
 *   - On error: { success: false, error: string }
 */
async function fetchChartData(chartId) {
    // Build payload from current filter state
    const payload = buildPayload();

    try {
        // Make POST request to backend
        const res = await fetch(`${SCALEX_API_BASE}/${chartId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        // Attempt to parse response JSON
        let json;
        try {
            json = await res.json();
        } catch (e) {
            console.error(`API JSON parse error (${chartId}):`, e);
            return { success: false, error: 'Invalid JSON from server' };
        }

        // Check HTTP status – if not OK, return error
        if (!res.ok) {
            console.error(`API HTTP error (${chartId}):`, res.status, json);
            return { success: false, error: json || res.statusText };
        }

        // Return successful response
        return json;
    } catch (err) {
        // Network error or other exception
        console.error(`API Error (${chartId}):`, err);
        return { success: false, error: err?.message || String(err) };
    }
}

/* ---------------------------------------------------------------------------
 * SECTION 5: PAGE REFRESH, CHART FETCHING & HELPER FUNCTIONS
 * ---------------------------------------------------------------------------*/

window.showLoader = function () {
    const el = document.getElementById('loader');
    if (el) el.classList.remove('hidden');
};

window.hideLoader = function () {
    const el = document.getElementById('loader');
    if (el) el.classList.add('hidden');
};

/**
 * 5.1: Refresh all charts for current page
 * Fetches all chart data needed for the active page
 * Called when:
 *   - Initial page load
 *   - Date range filter changed
 *   - Tab/view switched
 *   - Apply Filters button clicked
 *   - Device/channel/location filter changed
 *
 * Flow:
 *   1. Update CURRENT_PAGE (parameter or use stored value)
 *   2. Save to sessionStorage
 *   3. Get list of chart IDs for this page
 *   4. For each chart:
 *      a. Fetch data from API
 *      b. Pass response to renderChartFromAPI()
 *      c. Chart rendering layer handles display
 *
 * Parallel execution:
 *   - Uses Promise.all() conceptually (awaits in sequence shown, but could be optimized)
 *   - Each chart request is independent
 *   - Can safely run in parallel with Promise.all([...])
 *
 * @param {string} pageName – Optional page name to switch to
 *   Values: 'performance-overview' or 'channel-campaign-analytics'
 *   Defaults to stored CURRENT_PAGE if not provided
 */
async function refreshPage(pageName = CURRENT_PAGE) {
    // Update global page state
    CURRENT_PAGE = pageName;
    sessionStorage.setItem("activePage", CURRENT_PAGE);

    // console.log("🔄 Refreshing Page:", CURRENT_PAGE);

    // START LOADER
    if (window.showLoader) window.showLoader();

    try {
        // // 1. Clear existing charts (cleanup memory)
        // // Note: Commented out – called by detail rendering functions instead
        // if (window.clearDetailCharts) window.clearDetailCharts();

        // 2. Get list of all chart IDs needed for this page
        const chartList = getChartsForPage(pageName);

        // 3. Fetch data for each chart
        /* for (const chartId of chartList) {
            // Request data from backend
            const response = await fetchChartData(chartId);

            // Pass response to chart rendering layer (dashboard_charts.js)
            if (window.renderChartFromAPI) {
                window.renderChartFromAPI(chartId, response);
            }
        } */
        const promises = chartList.map(chartId =>
            fetchChartData(chartId).then(response => ({ chartId, response }))
        );

        const results = await Promise.allSettled(promises);

        for (const res of results) {
            if (res.status === 'fulfilled') {
                const { chartId, response } = res.value;
                if (window.renderChartFromAPI) {
                    window.renderChartFromAPI(chartId, response);
                }
            } else {
                console.warn('[ScaleX] Chart API failed for some chart:', res.reason);
            }
        }

    } finally {
        // STOP LOADER (always)
        if (window.hideLoader) window.hideLoader();
    }
}

// explicitly expose
window.refreshPage = refreshPage;

/* ---------------------------------------------------------------------------
 * SECTION 6: PAGE-TO-CHART MAPPING
 * ---------------------------------------------------------------------------*/

/**
 * 6.1: Get all chart IDs required for a given page
 * Maps page/view names to their associated chart IDs
 * 
 * Chart IDs are backend identifiers sent to API
 * Not the same as display names in UI
 *
 * Page: "performance-overview"
 *   Charts:
 *     - KPI cards: revenue, ad_spend, ROAS, ROI
 *     - Smart alerts: performance_gain, channel_mix, budget_reallocation
 *     - Detail visualizations: funnel, CAC trends, pipeline, LTV, attribution, ROAS, mix
 *   Total: 17 charts
 *
 * Page: "channel-campaign-analytics"
 *   Charts:
 *     - Channel metrics: CPL, CAC, ROAS by channel
 *     - Campaign analysis: ROI bubble, touchpoint split
 *     - Audience insights: ROAS by segment
 *     - Quality metrics: lead quality score
 *     - Efficiency: spend vs revenue share
 *     - Creative performance: CTR, CPC, engagement
 *     - Summary table: all channels combined
 *   Total: 8 charts
 *
 * @param {string} page – Page identifier
 *   'performance-overview' or 'channel-campaign-analytics'
 * @returns {string[]} Array of chart IDs for this page
 *   Empty array if page not recognized
 */
function getChartsForPage(page) {
    // ===== PERFORMANCE OVERVIEW PAGE =====
    if (page === "performance-overview") {
        return [
            // 6.1.1: KPI Cards (top of page)
            "kpi_revenue",                // Revenue YTD with sparkline
            "kpi_ad_spend",               // Ad Spend YTD with sparkline
            "kpi_roas",                   // Return on Ad Spend ratio
            "kpi_roi",                    // Return on Investment %

            // 6.1.2: Smart Alerts (alert banner area)
            "alert_performance_gain",     // Performance Gain notification
            "alert_channel_mix",          // Channel Mix Efficiency alert
            "alert_budget_reallocation",  // Budget Reallocation recommendation

            // 6.1.3: Detail Charts (main content area)
            "perf_funnel_by_channel",         // Spend → Revenue → ROI → ROAS
            "perf_cac_blended_vs_paid",       // Blended vs Paid CAC comparison
            "perf_cac_trend_by_channel",      // CAC trends for Meta, Google, LinkedIn
            "perf_paid_roi_by_stage",         // ROI progression: Lead → MQL → SQL → Converted
            "perf_pipeline_value",            // Pipeline value attributed to marketing
            "perf_ltv_cac_ratio",             // LTV:CAC ratio metric card
            "perf_ltv_by_cohort",             // LTV by quarterly cohort
            "perf_attribution_accuracy",      // Attribution accuracy vs baseline
            "perf_top_channels_roas",         // Top channels by ROAS (ranked)
            "perf_new_vs_repeat_mix"          // New vs Repeat customer revenue split
        ];
    }

    // ===== CHANNEL & CAMPAIGN ANALYTICS PAGE =====
    if (page === "channel-campaign-analytics") {
        return [
            // 6.1.4: Channel Performance Charts
            "channel_cpl_cac_roas",       // Channel-wise CPL · CAC · ROAS comparison
            "campaign_roi_bubble",        // Campaign ROI bubble chart with spend/revenue
            "channel_touchpoint_split",   // Touch-point attribution: first/mid/last
            "audience_roas",              // Audience segment ROAS (new/repeat/lookalike)
            "channel_lead_quality",       // Lead quality score by channel (0-100)
            "channel_spend_efficiency",   // Spend efficiency: spend% vs revenue%
            "creative_perf_tiles",        // Creative performance metrics (CTR, CPC, engagement)
            "channel_snapshot_table"      // Channel performance summary table (all metrics)
        ];
    }

    // 6.1.5: Unknown page – return empty array
    return [];
}

/* ---------------------------------------------------------------------------
 * SECTION 7: EXPORT & GLOBAL INTEGRATION
 * ---------------------------------------------------------------------------*/

/**
 * 7.1: Export functions to global window object
 * Allows dashboard_layout.js to call API functions
 * 
 * Exported:
 *   - window.refreshPage(pageName)
 *   - window.fetchChartData(chartId)
 *   - window.getStoredFilters()
 *   - window.buildPayload()
 *   - window.getChartsForPage(page)
 *
 * Usage from dashboard_layout.js:
 *   window.refreshPage('performance-overview')
 *   window.refreshPage('channel-campaign-analytics')
 */

// These are implicitly global in this file
// No explicit exports needed – functions are called directly from dashboard_layout.js
// Example: handleViewChange() → window.refreshPage(newView)



/* ---------------------------------------------------------------------------
 * SECTION 8: API INTEGRATION HOOK
 * ---------------------------------------------------------------------------*/

/* --------------------------------------------------------------------------
 * 8.1: HELPER FUNCTIONS
 * ----------------------------------------------------------------------- */

/**
 * Store Chart.js instances for KPI sparklines so we can destroy and
 * recreate them safely whenever filters / tabs change.
 */
const SCALEX_KPI_CHARTS = {
    revenue: null,
    spend: null,
    roas: null,
    roi: null
};

/**
 * Render (or re-render) a KPI sparkline inside the given canvas element.
 *
 * @param {HTMLCanvasElement} canvasEl   – target canvas
 * @param {number[]}          values     – numeric series for the sparkline
 * @param {string}            strokeColor
 * @param {string}            fillColor
 * @param {string}            cacheKey   – one of: 'revenue' | 'spend' | 'roas' | 'roi'
 */
function renderKPISparkline(canvasEl, values, strokeColor, fillColor, cacheKey) {
    if (!canvasEl || !window.Chart) {
        console.warn('renderKPISparkline: missing canvas or Chart.js');
        return;
    }
    if (!Array.isArray(values) || values.length === 0) {
        console.warn('renderKPISparkline: empty or invalid values');
        return;
    }

    const ctx = canvasEl.getContext('2d');

    // Destroy previous chart instance if we have one
    if (cacheKey && SCALEX_KPI_CHARTS[cacheKey]) {
        try {
            SCALEX_KPI_CHARTS[cacheKey].destroy();
        } catch (e) {
            console.warn('KPI chart destroy failed for', cacheKey, e);
        }
        SCALEX_KPI_CHARTS[cacheKey] = null;
    }

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: values.map((_, i) => i + 1),
            datasets: [{
                data: values,
                borderColor: strokeColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.35,
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });

    if (cacheKey) {
        SCALEX_KPI_CHARTS[cacheKey] = chart;
    }
}


/* ------------------------------------------------------------------
 * KPI Card Updater (Reusable)
 * ------------------------------------------------------------------ */

/**
 * Updates KPI card numbers + change + sparkline for a given KPI type.
 *
 * @param {Object} data - API data: { currentValue, previousValue, deltaPercent, sparkline }
 * @param {string} currId - DOM id for current value
 * @param {string} prevId - DOM id for previous value
 * @param {string} changeId - DOM id for change percent element
 * @param {string} canvasId - DOM id for sparkline canvas
 * @param {string} kpiType - 'revenue' | 'spend' | 'roas' | 'roi'
 */
function updateKpiCards(data, currId, prevId, changeId, canvasId, kpiType) {
    // --- KPI configuration (single source of truth) ---
    const kpiConfig = {
        revenue: {
            prefix: '₹ ',
            suffix: '',
            prevPrefix: 'Prev: ₹ ',
            invert: false,
            format: (v) => formatNumber(v),
            color: SCALEX_COLORS.kpiRevenue,
            fill: SCALEX_COLORS.kpiRevenueFill
        },
        spend: {
            prefix: '₹ ',
            suffix: '',
            prevPrefix: 'Prev: ₹ ',
            invert: true, // Spend up = bad
            format: (v) => formatNumber(v),
            color: SCALEX_COLORS.kpiSpend,
            fill: SCALEX_COLORS.kpiSpendFill
        },
        roas: {
            prefix: '',
            suffix: 'x',
            prevPrefix: 'Prev: ',
            invert: false,
            format: (v) => formatOneDecimal(v),
            color: SCALEX_COLORS.kpiRoas,
            fill: SCALEX_COLORS.kpiRoasFill
        },
        roi: {
            prefix: '',
            suffix: '%',
            prevPrefix: 'Prev: ',
            invert: false,
            format: (v) => formatOneDecimal(v),
            color: SCALEX_COLORS.kpiRoi,
            fill: SCALEX_COLORS.kpiRoiFill
        }
    };

    const cfg = kpiConfig[kpiType];
    if (!cfg) return;

    const currEl = document.getElementById(currId);
    const prevEl = document.getElementById(prevId);
    const changeEl = document.getElementById(changeId);
    const chartCanvas = document.getElementById(canvasId);

    // Current
    if (currEl && typeof data.currentValue === 'number') {
        currEl.textContent = cfg.prefix + cfg.format(data.currentValue) + cfg.suffix;
    }

    // Previous
    if (prevEl && typeof data.previousValue === 'number') {
        prevEl.textContent = cfg.prevPrefix + cfg.prefix + cfg.format(data.previousValue) + cfg.suffix;
        // Note: For revenue/spend, cfg.prevPrefix already contains ₹. For roas/roi it doesn't.
        // So we avoid double ₹ by handling it cleanly below:
        if (kpiType === 'revenue' || kpiType === 'spend') {
            prevEl.textContent = cfg.prevPrefix + cfg.format(data.previousValue) + cfg.suffix;
        }
    }

    // Change
    if (changeEl && typeof data.deltaPercent === 'number') {
        applyChange(changeEl, data.deltaPercent, cfg.invert);
    }

    // Sparkline
    if (chartCanvas && Array.isArray(data.sparkline) && data.sparkline.length > 0) {
        renderKPISparkline(
            chartCanvas,
            data.sparkline,
            cfg.color,
            cfg.fill,
            kpiType
        );
    }
}


// ---------------------------------------------------------------------
// SMART ALERTS – Generic DOM updater
// ---------------------------------------------------------------------

function updateSmartAlertCard(cardId, cardLabel, data) {
    const card = document.getElementById(cardId);
    if (!card || !data) return;

    const {
        severity,
        icon,
        mainPrefix,
        mainHighlight,
        mainSuffix,
        subtext
        // metrics / channels are extra, used later if needed
    } = data;

    const labelEl     = card.querySelector('.alert-text-label');
    const prefixEl    = card.querySelector('.alert-main-prefix');
    const highlightEl = card.querySelector('.alert-main-highlight');
    const suffixEl    = card.querySelector('.alert-main-suffix');
    const subtextEl   = card.querySelector('.alert-text-sub');
    const symbolEl    = card.querySelector('.alert-symbol');

    if (!labelEl || !prefixEl || !highlightEl || !suffixEl || !subtextEl || !symbolEl) {
        console.warn('[ScaleX] Smart alert DOM structure missing in card:', cardId);
        return;
    }

    // 1) Static label (title of card)
    labelEl.textContent = cardLabel;

    // 2) Text content from API
    prefixEl.textContent    = mainPrefix || '';
    highlightEl.textContent = mainHighlight || '';
    suffixEl.textContent    = mainSuffix || '';
    subtextEl.textContent   = subtext || '';

    // 3) Severity-based styling
    const { highlightClass, symbolClass, fallbackIcon } = mapSeverityToClasses(severity);

    // Remove old highlight color classes
    highlightEl.classList.remove(
        'alert-highlight-green',
        'alert-highlight-red',
        'alert-highlight-amber',
        'alert-highlight-sky'
    );
    highlightEl.classList.add(highlightClass);

    // Remove old symbol color classes
    symbolEl.classList.remove(
        'alert-symbol--green',
        'alert-symbol--red',
        'alert-symbol--amber',
        'alert-symbol--sky'
    );
    symbolEl.classList.add(symbolClass);

    // 3b) Apply border color based on severity
    card.classList.remove(
        'alert-card--positive',
        'alert-card--negative',
        'alert-card--warning',
        'alert-card--info'
    );
    card.classList.add(`alert-card--${severity}`);

    // 4) Icon (use API icon if present, else severity default)
    const iconChar = mapIconCode(icon) || fallbackIcon;
    symbolEl.textContent = iconChar;
}

// Update "Spend → Revenue → ROI → ROAS" funnel chart from API response.
function updatePerfFunnelFromAPI(apiData) {
    const chart = window.scalexPerfFunnelChart;

    if (!chart) {
        console.warn('Perf funnel chart instance not ready yet, skipping API update.');
        return;
    }

    const labels = Array.isArray(apiData.labels) && apiData.labels.length
        ? apiData.labels
        : chart.data.labels;

    const datasets = Array.isArray(apiData.datasets) ? apiData.datasets : [];

    // Update X-axis labels from backend
    chart.data.labels = labels;

    /**
     * Helper: build money + ratio arrays for one channel
     * based on label match ("Meta", "Google", "LinkedIn").
     */
    function splitChannel(channelName) {
        const ds = datasets.find(d =>
            typeof d.label === 'string' &&
            d.label.toLowerCase().includes(channelName)
        );

        // If nothing found, keep existing data (so chart doesn’t break)
        if (!ds || !Array.isArray(ds.data)) {
            console.warn(`No dataset found for channel "${channelName}" in funnel API data.`);
            return {
                money: [],
                ratio: []
            };
        }

        const money = [];
        const ratio = [];

        labels.forEach((stage, idx) => {
            const v = ds.data[idx];

            if (stage === 'Spend' || stage === 'Revenue') {
                // Money axis (₹)
                money.push(typeof v === 'number' ? v : null);
                ratio.push(null);
            } else if (stage === 'ROAS' || stage === 'ROI') {
                // Ratios axis (%), we multiply by 100 because
                // the existing chart expects "270" to mean "2.7x" etc.
                const percent = (typeof v === 'number') ? v * 100 : null;
                money.push(null);
                ratio.push(percent);
            } else {
                // Unknown stage – keep nulls
                money.push(null);
                ratio.push(null);
            }
        });

        return { money, ratio };
    }

    // Build series for Meta / Google / LinkedIn
    const meta     = splitChannel('meta');
    const google   = splitChannel('google');
    const linkedin = splitChannel('linkedin');

    const dsets = chart.data.datasets;

    // 0,1,2 = money; 3,4,5 = ratio
    if (dsets[0]) dsets[0].data = meta.money;
    if (dsets[1]) dsets[1].data = google.money;
    if (dsets[2]) dsets[2].data = linkedin.money;

    if (dsets[3]) dsets[3].data = meta.ratio;
    if (dsets[4]) dsets[4].data = google.ratio;
    if (dsets[5]) dsets[5].data = linkedin.ratio;

    chart.update();
}

// Update "Blended CAC vs Paid CAC" chart from API response.
function updateBlendedPaidCACFromAPI(apiData) {
    const chart = window.scalexBlendedPaidCACChart;

    if (!chart) {
        console.warn('Blended vs Paid CAC chart instance not ready yet, skipping API update.');
        return;
    }

    const labels = Array.isArray(apiData.labels) && apiData.labels.length
        ? apiData.labels
        : chart.data.labels;

    const incomingDatasets = Array.isArray(apiData.datasets) ? apiData.datasets : [];

    // Update X-axis labels from backend
    chart.data.labels = labels;

    // Find incoming series by label
    const blendedDs = incomingDatasets.find(d =>
        typeof d.label === 'string' &&
        d.label.toLowerCase().includes('blended')
    );
    const paidDs = incomingDatasets.find(d =>
        typeof d.label === 'string' &&
        d.label.toLowerCase().includes('paid')
    );

    // Our existing chart structure:
    // dataset[0] → Blended CAC
    // dataset[1] → Paid CAC
    const dsets = chart.data.datasets;

    if (dsets[0] && blendedDs && Array.isArray(blendedDs.data)) {
        dsets[0].data = blendedDs.data.slice(); // copy array for safety
    }

    if (dsets[1] && paidDs && Array.isArray(paidDs.data)) {
        dsets[1].data = paidDs.data.slice();
    }

    chart.update();
}

// Update CAC trend line chart (Meta / Google / LinkedIn)
function updateCacTrendByChannelFromAPI(apiData) {
    // Change this variable to your actual chart instance name
    const chart = window.scalexCacTrendByChannelChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    // We only replace the .data arrays, keep colors/tension from original config
    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    chart.update();
}

// Update ROI by funnel stage chart (Lead, MQL, SQL, Converted)
function updatePaidRoiByStageFromAPI(apiData) {
    // Use your real chart instance here
    const chart = window.scalexPaidRoiByStageChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    chart.update();
}

// Update marketing-influenced pipeline value over time
function updatePipelineValueFromAPI(apiData) {
    // Change to your actual chart name
    const chart = window.scalexPipelineValueChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets) && datasets[0] && chart.data.datasets[0]) {
        chart.data.datasets[0].data = datasets[0].data || [];
    }

    chart.update();
}

function updateLtvCacRatioFromAPI(data) {
    if (!data) return;

    const { ltv, cac, ratio, status } = data;

    // 1. Locate the card rendered by dashboard_charts.js
    // const card = document.querySelector('.detail-card[data-chart-id="perf_ltv_cac_ratio"]');
    const card = document.querySelector('[data-chart-id="perf_ltv_cac_ratio"]');
    if (!card) {
        console.warn("LTV:CAC card not found in DOM");
        return;
    }

    // 2. Update ratio element
    const ratioEl = card.querySelector('.detail-ltv-ratio');
    if (ratioEl) {
        ratioEl.textContent = `${ratio.toFixed(1)} : 1`;
    }

    // 3. Update subtext (LTV + CAC values)
    const subEl = card.querySelector('.detail-ltv-subtext');
    if (subEl) {
        subEl.textContent = `Avg LTV: ${formatRupee(ltv)} · CAC: ${formatRupee(cac)}`;
    }

    // 4. Update badge (status)
    const badge = card.querySelector('.detail-ltv-badge');
    if (badge) {
        // Remove existing status modifiers
        badge.classList.remove(
            'detail-ltv-badge--healthy',
            'detail-ltv-badge--warning',
            'detail-ltv-badge--risk'
        );

        // Add new modifier
        badge.classList.add(`detail-ltv-badge--${status}`);

        // Update text
        badge.textContent =
            status === 'healthy' ? 'Healthy' :
            status === 'warning' ? 'Watch' :
            'At Risk';
    }
}

// Update LTV by cohort chart (bar or line)
function updateLtvByCohortFromAPI(apiData) {
    const chart = window.scalexLtvByCohortChart; 
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets) && datasets[0] && chart.data.datasets[0]) {
        chart.data.datasets[0].data = datasets[0].data || [];
    }

    chart.update();
}

// Update attribution accuracy vs baseline chart
function updateAttributionAccuracyFromAPI(apiData) {
    const chart = window.scalexAttributionAccuracyChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    chart.update();
}

// Update top channels by ROAS bar chart
function updateTopChannelsRoasFromAPI(apiData) {
    const chart = window.scalexTopChannelsRoasChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets) && datasets[0] && chart.data.datasets[0]) {
        chart.data.datasets[0].data = datasets[0].data || [];
    }

    chart.update();
}

// Update new vs repeat revenue mix chart (stacked %)
function updateNewVsRepeatMixFromAPI(apiData) {
    const chart = window.scalexNewVsRepeatMixChart;
    if (!chart) return;

    const { labels, datasets, tooltipRevenue } = apiData || {};

    // Labels
    chart.data.labels = labels || [];

    // Find the correct datasets by label (safer than relying on index order)
    if (Array.isArray(datasets)) {
        const newDs = datasets.find(ds =>
            typeof ds.label === 'string' && ds.label.toLowerCase().includes('new')
        );
        const repeatDs = datasets.find(ds =>
            typeof ds.label === 'string' && ds.label.toLowerCase().includes('repeat')
        );

        if (newDs) {
            chart.data.datasets[0].data = newDs.data || [];
        }
        if (repeatDs) {
            chart.data.datasets[1].data = repeatDs.data || [];
        }
    }

    // 🔹 Update tooltip revenue data on chart instance
    chart.__tooltipRevenue = {
        new: (tooltipRevenue && tooltipRevenue.new) || [],
        repeat: (tooltipRevenue && tooltipRevenue.repeat) || []
    };

    chart.update();
}


function updateChannelCplCacRoasFromAPI(apiData) {
    const chart = window.scalexChannelCplCacRoasChart;
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    chart.update();
}

// Update Campaign ROI Bubble chart from API response
function updateCampaignRoiBubbleFromAPI(apiData) {
    const chart = window.scalexCampaignRoiBubbleChart;
    if (!chart || !apiData) return;

    const { datasets = [], currency = 'INR' } = apiData;

    if (!Array.isArray(datasets) || datasets.length === 0) {
        console.warn('[ScaleX] No datasets returned for campaign ROI bubble chart');
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }

    const bubblePoints = datasets.map((ds) => {
        const label = ds.label || 'Campaign';
        const point = ds.point || {};

        const roiPercent = Number(point.roiPercent) || 0;
        const spend = Number(point.spend) || 0;         // in ₹
        const revenue = Number(point.revenue) || 0;     // in ₹
        const incrementalRoasPercent = Number(point.incrementalRoasPercent) || 0;

        // Convert to Lakhs for Y-axis + tooltip
        const spendLakh = spend / 100000;
        const revenueLakh = revenue / 100000;

        // Bubble radius: keep your existing logic style
        const radius = Math.max(8, Math.sqrt(Math.max(revenueLakh, 0)) * 3);

        // Try to split channel + campaign from label like "Meta – Lead Gen"
        const [channelPart, ...rest] = label.split('–');
        const channel = (channelPart || '').trim();
        const name = rest.length ? rest.join('–').trim() : label;

        return {
            x: roiPercent,
            y: spendLakh,
            r: radius,
            _meta: {
                name,
                channel,
                roi: roiPercent,
                spendLakh,
                revenueLakh,
                incrRoas: incrementalRoasPercent,
                currency
            }
        };
    });

    // Preserve styling from original dataset, only replace `data`
    if (!chart.data.datasets || chart.data.datasets.length === 0) {
        chart.data.datasets = [{
            label: 'Campaigns',
            data: bubblePoints
        }];
    } else {
        chart.data.datasets[0].data = bubblePoints;
        chart.data.datasets[0].label = 'Campaigns';
    }

    // Optional: store currency on chart if you ever want it in tooltip
    chart.__currency = currency;

    chart.update();
}

function updateChannelTouchpointSplitFromAPI(apiData) {
    const chart = window.scalexTouchpointSplitChart; //
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    chart.update();
}

function updateAudienceRoasFromAPI(apiData) {
    const chart = window.scalexAudienceRoasChart; //
    if (!chart) return;

    const { labels, datasets } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets) && datasets[0] && chart.data.datasets[0]) {
        chart.data.datasets[0].data = datasets[0].data || [];
    }

    chart.update();
}

// Update "Lead Quality Score by Channel" from API
function updateChannelLeadQualityFromAPI(apiData) {
    const chart = window.scalexLeadQualityChart;
    if (!chart || !apiData) return;

    const { labels, datasets } = apiData;
    if (!Array.isArray(datasets) || !datasets[0]) return;

    const scores = datasets[0].data || [];

    chart.data.labels = labels || [];
    chart.data.datasets[0].data = scores;

    // Recompute colors based on score buckets
    const colors = scores.map((score) => {
        if (score >= 80) return SCALEX_COLORS.good;
        if (score >= 70) return SCALEX_COLORS.warning;
        return SCALEX_COLORS.bad;
    });

    chart.data.datasets[0].backgroundColor = colors;
    chart.data.datasets[0].borderColor = colors;

    chart.update();
}

function updateChannelSpendEfficiencyFromAPI(apiData) {
    const chart = window.scalexSpendEfficiencyChart; 
    if (!chart) return;

    const { labels, datasets, index } = apiData;

    chart.data.labels = labels || [];

    if (Array.isArray(datasets)) {
        datasets.forEach((ds, idx) => {
            if (chart.data.datasets[idx]) {
                chart.data.datasets[idx].data = ds.data || [];
            }
        });
    }

    // Optional: store index array on chart for custom tooltip / annotation
    chart.__efficiencyIndex = index || [];

    chart.update();
}

// Update Creative Performance metric tiles from API response
function updateCreativePerfTilesFromAPI(apiData) {
    if (!apiData || !apiData.ctr || !apiData.cpc || !apiData.engagement) return;

    const tiles = document.querySelectorAll('.metric-tiles-wrapper .metric-tile');
    if (!tiles.length) return;

    const [ctrTile, cpcTile, engagementTile] = tiles;

    function updateTile(tile, type, metricData) {
        if (!tile || !metricData) return;

        const valueEl = tile.querySelector('.metric-tile-value');
        const deltaEl = tile.querySelector('.metric-tile-delta');
        if (!valueEl || !deltaEl) return;

        // Reset direction classes
        deltaEl.classList.remove('alert-symbol--green', 'alert-symbol--red', 'alert-symbol--sky');

        const arrow = mapIconCode(metricData.direction);
        const dirClass = mapIconColor(metricData.direction);
        deltaEl.classList.add(dirClass);

        if (type === 'ctr' || type === 'engagement') {
            // % value + percentage-points delta
            const current = Number(metricData.currentPercent).toFixed(1);
            const deltaPoints = Number(metricData.deltaPoints).toFixed(1);

            valueEl.textContent = `${current.toLocaleString()}%`;
            deltaEl.textContent = `${arrow} ${deltaPoints.toLocaleString()}pp vs prev`;
        } else if (type === 'cpc') {
            // Currency value + % delta
            const current = Number(metricData.currentValue).toFixed(1);
            const deltaPercent = Number(metricData.deltaPercent).toFixed(1);

            // Always show as ₹; backend already decided currency
            valueEl.textContent = `₹ ${current.toLocaleString()}`;
            deltaEl.textContent = `${arrow} ${Math.abs(deltaPercent).toFixed(1)}% vs prev`;
        }
    }

    updateTile(ctrTile, 'ctr', apiData.ctr);
    updateTile(cpcTile, 'cpc', apiData.cpc);
    updateTile(engagementTile, 'engagement', apiData.engagement);
}

// Update Channel Performance Snapshot table from API
function updateChannelSnapshotTableFromAPI(apiData) {
    if (!apiData) return;

    const { columns, rows } = apiData;
    if (!Array.isArray(rows) || !rows.length) return;

    // Find the table body
    const tbody = document.querySelector('.channel-performance-table tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    // Build a column index lookup for safety (in case order changes)
    const colIndex = {
        channel: columns ? columns.indexOf('channel') : 0,
        spend: columns ? columns.indexOf('spend') : 1,
        revenue: columns ? columns.indexOf('revenue') : 2,
        cpl: columns ? columns.indexOf('cpl') : 3,
        cac: columns ? columns.indexOf('cac') : 4,
        roas: columns ? columns.indexOf('roas') : 5,
        roiPercent: columns ? columns.indexOf('roiPercent') : 6,
        leadQuality: columns ? columns.indexOf('leadQuality') : 7
    };

    // Helper to read a cell safely
    const getCell = (row, key) => {
        const idx = colIndex[key];
        return idx >= 0 && idx < row.length ? row[idx] : null;
    };

    rows.forEach(row => {
        const channel     = getCell(row, 'channel') ?? '';
        const spend       = getCell(row, 'spend');
        const revenue     = getCell(row, 'revenue');
        const cpl         = getCell(row, 'cpl');
        const cac         = getCell(row, 'cac');
        const roas        = getCell(row, 'roas');
        const roiPercent  = getCell(row, 'roiPercent');
        const leadQuality = getCell(row, 'leadQuality');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${channel}</td>
            <td>${spend != null ? formatRupee(spend) : '-'}</td>
            <td>${revenue != null ? formatRupee(revenue) : '-'}</td>
            <td>${cpl != null ? formatRupee(cpl) : '-'}</td>
            <td>${cac != null ? formatRupee(cac) : '-'}</td>
            <td>${roas != null ? Number(roas).toFixed(2) + 'x' : '-'}</td>
            <td>${roiPercent != null ? Number(roiPercent).toFixed(0) + '%' : '-'}</td>
            <td>${leadQuality != null ? leadQuality : '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Optional: store latest data for CSV export handler
    window.scalexChannelSnapshotLatest = {
        columns,
        rows,
        currency: apiData.currency || 'INR'
    };
}

/* --------------------------------------------------------------------------
 * 8.2: Render chart from API response
 * ----------------------------------------------------------------------- */
/**
 * Entry point for API responses to update dashboard visualizations.
 *
 * Called from: dashboard_chart_api.js → refreshPage()
 *
 * @param {string} chartId  – Identifier (e.g. 'kpi_revenue')
 * @param {object} response – API response { success, data, metadata, error }
 */
window.renderChartFromAPI = function renderChartFromAPI(chartId, response) {
    console.debug('📊 renderChartFromAPI →', chartId, response);

    // Defensive checks
    if (!response || response.success === false) {
        console.warn(`Chart ${chartId} failed or returned error`, response && response.error);
        return;
    }

    // Expected structure: { success: true, data: {...}, metadata: {...}, error: null }
    const data = response.data || {};

    // ======================================================================
    // DETAIL CHARTS (Performance Overview)
    // ======================================================================
    
    switch (chartId) {

        // 🔹 Performance Overview – KPI's
        case 'kpi_revenue':
            updateKpiCards(data, 'rev-current', 'rev-prev', 'rev-change', 'rev-chart', 'revenue');
            break;
        case 'kpi_ad_spend':
            updateKpiCards(data, 'spend-current', 'spend-prev', 'spend-change', 'spend-chart', 'spend');
            break;
        case 'kpi_roas':
            updateKpiCards(data, 'roas-current', 'roas-prev', 'roas-change', 'roas-chart', 'roas');
            break;
            case 'kpi_roi':
                updateKpiCards(data, 'roi-current', 'roi-prev', 'roi-change', 'roi-chart', 'roi');
                break;
        
        // 🔹 Performance Overview – SMART ALERTS
        case 'alert_performance_gain':
            updateSmartAlertCard(
                'alert-card-performance-gain',
                'Performance Gain',
                data
            );
            break;

        case 'alert_channel_mix':
            updateSmartAlertCard(
                'alert-card-channel-mix',
                'Channel Mix Efficiency',
                data
            );
            break;

        case 'alert_budget_reallocation':
            updateSmartAlertCard(
                'alert-card-budget-risk',
                'Budget / Risk',
                data
            );
            break;
                
        // 🔹 Performance Overview – charts
        case 'perf_funnel_by_channel':
            updatePerfFunnelFromAPI(data);
            break;
        case 'perf_cac_blended_vs_paid':
            updateBlendedPaidCACFromAPI(data);
            break;
        case 'perf_cac_trend_by_channel':
            updateCacTrendByChannelFromAPI(data);
            break;
        case 'perf_paid_roi_by_stage':
            updatePaidRoiByStageFromAPI(data);
            break;
        case 'perf_pipeline_value':
            updatePipelineValueFromAPI(data);
            break;
        case 'perf_ltv_cac_ratio':
            updateLtvCacRatioFromAPI(data);
            break;
        case 'perf_ltv_by_cohort':
            updateLtvByCohortFromAPI(data);
            break;
        case 'perf_attribution_accuracy':
            updateAttributionAccuracyFromAPI(data);
            break;
        case 'perf_top_channels_roas':
            updateTopChannelsRoasFromAPI(data);
            break;
        case 'perf_new_vs_repeat_mix':
            updateNewVsRepeatMixFromAPI(data);
            break;

        // 🔹 Channel & Campaign Analytics - charts
        case 'channel_cpl_cac_roas':
            updateChannelCplCacRoasFromAPI(data);
            break;
        case 'campaign_roi_bubble':
            updateCampaignRoiBubbleFromAPI(data);
            break;
        case 'channel_touchpoint_split':
            updateChannelTouchpointSplitFromAPI(data);
            break;
        case 'audience_roas':
            updateAudienceRoasFromAPI(data);
            break;
        case 'channel_lead_quality':
            updateChannelLeadQualityFromAPI(data);
            break;
        case 'channel_spend_efficiency':
            updateChannelSpendEfficiencyFromAPI(data);
            break;
        case 'creative_perf_tiles':
            updateCreativePerfTilesFromAPI(data);
            break;
        case 'channel_snapshot_table':
            updateChannelSnapshotTableFromAPI(data);
            break;

        default:
            console.warn(`No renderer implemented yet for chartId="${chartId}"`);
    }
};

/* ============================================================================
 * END OF dashboard_chart_api.js
 * ========================================================================== */
