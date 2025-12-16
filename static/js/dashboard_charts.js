/* ============================================================================
 * dashboard_charts.js
 *
 * Complete chart, KPI, and smart alert rendering engine
 *
 * Responsibilities:
 * - Global color palette (SCALEX_COLORS) for all charts and visualizations
 * - KPI data structures and sample data generation
 * - Chart rendering functions for Performance Overview (10+ detail charts)
 * - Chart rendering functions for Channel Analytics (8+ detail charts)
 * - Chart modal management (open, close, download PNG/PDF)
 * - Detail card utilities (create cards, manage containers)
 * - Smart alerts rendering infrastructure
 * - CSV export for channel performance data
 * - API integration hooks for future backend connections
 *
 * Dependencies:
 * - Chart.js library (global window.Chart)
 * - html-to-image library (for PNG export)
 * - jsPDF library (for PDF export)
 * - HTML elements: #chart-modal, #chart-modal-canvas, #detail-charts
 * - HTML elements: KPI card IDs (rev-current, spend-current, etc.)
 * - CSS classes: .detail-card, .detail-card-title, .chart-clickable, etc.
 *
 * Called by:
 * - dashboard_layout.js (initialization on DOMContentLoaded)
 * - dashboard_chart_api.js (API response handling)
 * - Internal functions (detail rendering on view changes)
 *
 * Calls to:
 * - window.renderChartFromAPI() exported for API integration
 * - Chart.js new Chart(ctx, config) for all visualizations
 *
 * Version: 1.0
 * Author: Dashboard Development Team
 * Last Updated: 2025-12-11
 *
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * SECTION 1: GLOBAL COLOR PALETTE, LOADER & CONSTANTS
 * ---------------------------------------------------------------------------*/

/**
 * Global color palette – one centralized place to change all brand and chart colors
 * Used by all charts, KPI cards, detail visualizations, and alerts
 * Covers: Meta (Violet), Google (Sky Blue), LinkedIn (Emerald)
 * Plus: KPI metrics, neutral helpers, status indicators, bubble charts
 */
const SCALEX_COLORS = {
    // 1.1 Brand/Channel Colors (Primary)
    meta:           '#A78BFA', // Soft Violet
    google:         '#38BDF8', // Sky Blue
    linkedin:       '#34D399', // Emerald

    // 1.2 KPI/Metric Accent Colors (Line/Sparkline)
    kpiRevenue:     '#22C55E', // Green – Revenue is good ↑
    kpiSpend:       '#6366F1', // Indigo – Spend tracking
    kpiRoas:        '#FBBF24', // Amber – ROAS highlight (warmth)
    kpiRoi:         '#EC4899', // Pink – ROI accent

    // 1.3 KPI Fill Colors (Semi-transparent for area charts)
    kpiRevenueFill: 'rgba(34,197,94,0.12)',
    kpiSpendFill:   'rgba(99,102,241,0.16)',
    kpiRoasFill:    'rgba(251,191,36,0.16)',
    kpiRoiFill:     'rgba(236,72,153,0.18)',

    // 1.4 Neutral/Helper Colors
    neutralBar:     '#9CA3AF', // Grey – Baseline bars, secondary metrics
    neutralAxis:    '#64748B', // Slate – Axis lines/text if needed
    tableBorder:    '#1F2937', // Dark gray – Table dividers

    // 1.5 Status/Quality Indicator Colors (Traffic-light system)
    good:           '#22C55E', // Green – Healthy/Good
    warning:        '#FBBF24', // Amber – Warning/Watch
    bad:            '#F97373', // Red – Bad/At Risk

    // 1.6 Bubble Chart Colors
    bubbleFill:     'rgba(129, 140, 248, 0.45)', // Indigo fill (45% opacity)
    bubbleStroke:   'rgba(129, 140, 248, 0.95)'  // Indigo border (95% opacity)
};

/* ---------------------------------------------------------------------------
 * SECTION 1.2: NOTES FOR COLOR USAGE (Documentation Only)
 * ---------------------------------------------------------------------------
 * Reference guide for developers – which colors to use for each page/chart:
 *
 * PERFORMANCE OVERVIEW PAGE:
 *   - Funnel chart: meta, google, linkedin for three channels
 *   - Blended vs Paid CAC: meta, google
 *   - CAC Trend by Channel: meta, google, linkedin
 *   - Paid Campaign ROI: meta, google, linkedin by stage
 *   - Pipeline Value: meta
 *   - LTV by Cohort: google
 *   - Attribution Accuracy: meta (baseline), google (actual)
 *   - Top Channels by ROAS: linkedin
 *   - New vs Repeat Mix: meta (new), google (repeat)
 *   - KPI Sparklines:
 *       Revenue → kpiRevenue + kpiRevenueFill
 *       Spend → kpiSpend + kpiSpendFill
 *       ROAS → kpiRoas + kpiRoasFill
 *       ROI → kpiRoi + kpiRoiFill
 *
 * CHANNEL & CAMPAIGN ANALYTICS PAGE:
 *   - Channel-wise CPL/CAC/ROAS: meta, google, linkedin
 *   - Campaign ROI Bubble: bubbleFill, bubbleStroke
 *   - Touch-Point Split: meta, google, linkedin
 *   - Audience Segment ROAS: google
 *   - Lead Quality Score: good, warning, bad (color-coded by score)
 *   - Spend Efficiency: neutralBar (spend), meta (revenue)
 * ---------------------------------------------------------------------------*/

/**
 * Common legend styling applied to most charts that use point-style legends
 * Standardizes appearance: rounded rectangles, consistent sizing
 */
const SCALEX_LEGEND_COMMON = {
    labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded',
        boxWidth: 20,
        boxHeight: 10
    }
};

/**
 * Conversion factor: pixels to millimeters
 * Used for PDF export calculations
 * Assumes ~96 dpi (standard screen DPI)
 * Formula: 25.4mm / 96dpi = 0.2646 mm/px
 */
const PX_TO_MM = 25.4 / 96;

/* ---------------------------------------------------------------------------
 * SECTION 2: FORMATTING FUNCTIONS
 * ---------------------------------------------------------------------------*/

/**
 * 2.1: Format number as Indian Rupees with commas
 * Example: 1234567 → "₹1,234,567"
 * @param {number} value – Raw numeric value
 * @returns {string} Formatted rupee string
 */
function formatRupee(value) {
    return `₹${value.toLocaleString()}`;
}

/**
 * 2.2: Format number as compact rupees (Crore/Lakh/Thousand)
 * - ≥ 1 Cr (10M) → "₹X.YCr"
 * - ≥ 1 L (100K) → "₹X.YL"
 * - ≥ 1k → "₹X.Yk"
 * - Otherwise → "₹X"
 * Useful for axis labels in charts to avoid clutter
 * Example: 15000000 → "₹1.5Cr"
 * @param {number} value – Raw numeric value
 * @returns {string} Compact formatted rupee string
 */
function formatRupeeCompact(value) {
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(1)}Cr`;
    }
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)}k`;
    }
    return `₹${value}`;
}

/**
 * 2.3: Format number with localized separator, no decimals
 * Example: 1234567 → "1,234,567"
 * @param {number} v – Numeric value
 * @returns {string} Formatted number string
 */
function formatNumber(v) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * 2.4: Format number with exactly 1 decimal place
 * Example: 3.666 → "3.7"
 * Used for ROAS (3.5x), ROI (215%), avg metrics
 * @param {number} v – Numeric value
 * @returns {string} Formatted number with 1 decimal
 */
function formatOneDecimal(v) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/* ---------------------------------------------------------------------------
 * SECTION 3: CHART REGISTRY & MODAL STATE
 * ---------------------------------------------------------------------------*/

/**
 * 3.1: Global registry of all Chart.js instances
 * Key: canvas DOM element
 * Value: Chart.js instance
 * Used to:
 *   - Store reference to each chart
 *   - Retrieve chart config when opening modal
 *   - Replicate chart in fullscreen view
 */
const scalexChartRegistry = new Map();

/**
 * 3.2: Array to track detail Chart instances for cleanup
 * When switching views:
 *   1. Loop through this array
 *   2. Call .destroy() on each chart
 *   3. Clear the array
 *   4. Render new charts for new view
 * Prevents memory leaks from abandoned chart instances
 */
const scalexDetailCharts = [];

/**
 * 3.3: Modal chart state – shared across open/close/download functions
 */
let scalexModalChart = null;      // Current Chart.js instance in modal
let scalexModalSourceCanvas = null; // Original canvas that triggered modal
let scalexModalTitle = '';         // Chart title for export
let scalexModalSubtitle = '';      // Chart subtitle for export

/* ---------------------------------------------------------------------------
 * SECTION 4: CHART MODAL FUNCTIONS
 * ---------------------------------------------------------------------------*/

/**
 * 4.1: Open fullscreen modal for a given chart
 * Steps:
 *   1. Get source chart from registry
 *   2. Destroy any previous modal chart
 *   3. Extract title from canvas data attributes or card
 *   4. Extract subtitle from detail card (if present)
 *   5. Show modal container
 *   6. Recreate chart in modal with same config
 *
 * @param {HTMLCanvasElement} sourceCanvas – The chart canvas to display in modal
 */
function openChartModalFromCanvas(sourceCanvas) {
    const modal = document.getElementById('chart-modal');
    const modalCanvas = document.getElementById('chart-modal-canvas');
    const titleEl = document.getElementById('chart-modal-title');
    const subtitleEl = document.getElementById('chart-modal-subtitle');

    // Safety check: verify required elements exist
    if (!modal || !modalCanvas) return;

    // Get the Chart.js instance from registry
    const srcChart = scalexChartRegistry.get(sourceCanvas);
    if (!srcChart) {
        console.warn('No chart registered for canvas', sourceCanvas);
        return;
    }

    // Destroy any previous modal chart to free memory
    if (scalexModalChart) {
        try {
            scalexModalChart.destroy();
        } catch (e) {
            // Ignore destruction errors
        }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = sourceCanvas;

    // Extract title: dataset attr → card title → fallback
    const title =
        sourceCanvas.dataset.chartTitle ||
        sourceCanvas.closest('.detail-card-title')?.textContent ||
        'Chart';

    // Extract subtitle from detail card (optional)
    let subtitleText = '';
    const detailCard = sourceCanvas.closest('.detail-card');
    if (detailCard) {
        const subNode = detailCard.querySelector('.detail-card-subtitle');
        if (subNode) {
            subtitleText = subNode.textContent.trim();
        }
    }

    // Update modal DOM with title/subtitle
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitleText;

    // Store in JS state for export functions
    scalexModalTitle = title;
    scalexModalSubtitle = subtitleText;

    // Show modal
    modal.classList.remove('hidden');

    // Size modal canvas to fit container (2x resolution for clarity)
    const parent = modalCanvas.parentElement;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 500;
    modalCanvas.width = width * 2;
    modalCanvas.height = height * 2;

    // Recreate chart in modal using source chart's config
    const baseConfig = srcChart.config;
    const ctx = modalCanvas.getContext('2d');

    scalexModalChart = new Chart(ctx, {
        type: baseConfig.type,
        data: baseConfig.data,
        options: {
            ...baseConfig.options,
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * 4.2: Close fullscreen chart modal
 * Steps:
 *   1. Hide modal element
 *   2. Destroy modal chart instance
 *   3. Clear state variables
 */
function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) modal.classList.add('hidden');

    if (scalexModalChart) {
        try {
            scalexModalChart.destroy();
        } catch (e) {
            // Ignore destruction errors
        }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = null;
    scalexModalTitle = '';
    scalexModalSubtitle = '';
}

/**
 * 4.3: Download current modal chart as PNG or PDF
 * Composition:
 *   - Dark background (Slate-950 style)
 *   - Title in bold, Light gray text
 *   - Subtitle in regular, Muted gray text
 *   - Chart below with padding
 * 
 * For PNG: Direct canvas → data URL → download
 * For PDF: Canvas → PNG → jsPDF → save
 *
 * @param {string} format – 'png' or 'pdf'
 */
function downloadModalChart(format) {
    if (!scalexModalChart) return;

    const chartCanvas = scalexModalChart.canvas;

    // Layout constants for export composition (in pixels)
    const PADDING = 40;          // Outer margin
    const TITLE_LINE = 26;       // Title row height
    const SUBTITLE_LINE = 18;    // Subtitle row height
    const TITLE_GAP = 8;         // Space between title and subtitle
    const BLOCK_GAP = 12;        // Space between text block and chart

    const hasSubtitle = !!scalexModalSubtitle;

    // Compute total text block height
    let textBlockHeight = TITLE_LINE;
    if (hasSubtitle) {
        textBlockHeight += TITLE_GAP + SUBTITLE_LINE;
    }

    // Final export canvas dimensions
    const exportWidth = chartCanvas.width + PADDING * 2;
    const exportHeight = chartCanvas.height + PADDING * 2 + textBlockHeight + BLOCK_GAP;

    // Create canvas for final composed image
    const outCanvas = document.createElement('canvas');
    outCanvas.width = exportWidth;
    outCanvas.height = exportHeight;

    const ctx = outCanvas.getContext('2d');

    // Color constants for dark theme
    const BG_COLOR = '#020617';     // Slate-950 (very dark)
    const TITLE_COLOR = '#e5e7eb';  // Light gray
    const SUBTITLE_COLOR = '#9ca3af'; // Muted gray

    // Draw background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Draw title text
    ctx.fillStyle = TITLE_COLOR;
    ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';

    const titleX = PADDING;
    let textY = PADDING;
    const titleText = scalexModalTitle || 'Chart';
    ctx.fillText(titleText, titleX, textY);

    // Draw subtitle text (if present)
    if (hasSubtitle) {
        ctx.fillStyle = SUBTITLE_COLOR;
        ctx.font = '400 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        textY += TITLE_LINE + TITLE_GAP;
        ctx.fillText(scalexModalSubtitle, titleX, textY);
    }

    // Draw chart image below text block
    const chartY = PADDING + textBlockHeight + BLOCK_GAP;
    ctx.drawImage(chartCanvas, PADDING, chartY, chartCanvas.width, chartCanvas.height);

    const finalDataUrl = outCanvas.toDataURL('image/png');

    // --- PNG DOWNLOAD ---
    if (format === 'png') {
        const link = document.createElement('a');
        link.href = finalDataUrl;
        link.download = 'scalex-chart.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
    }

    // --- PDF DOWNLOAD ---
    if (format === 'pdf') {
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) {
            console.error('jsPDF not available for PDF export');
            return;
        }

        // Convert pixel dimensions to millimeters
        const pdfWidth = exportWidth * PX_TO_MM;
        const pdfHeight = exportHeight * PX_TO_MM;
        const orientation = pdfWidth > pdfHeight ? 'l' : 'p'; // landscape or portrait

        // Create PDF with custom dimensions
        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        // Add image to PDF
        pdf.addImage(finalDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('scalex-chart.pdf');
    }
}

/* ---------------------------------------------------------------------------
 * SECTION 5: DETAIL CHART UTILITIES
 * ---------------------------------------------------------------------------*/

/**
 * 5.1: Destroy all existing detail chart instances and clear container
 * Called when:
 *   - Switching between views (Performance Overview ↔ Channel Analytics)
 *   - Changing filters/date ranges
 *   - Refreshing data
 * Prevents memory leaks by properly destroying Chart.js instances
 */
function clearDetailCharts() {
    const container = document.getElementById('detail-charts');

    // Destroy each chart in array
    scalexDetailCharts.forEach(ch => {
        try {
            ch.destroy();
        } catch (e) {
            console.warn('Chart destruction error:', e);
        }
    });
    scalexDetailCharts.length = 0; // Empty the array

    // Clear HTML
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * 5.2: Create a detail card container with optional canvas
 * Structure:
 *   <div class="detail-card">
 *       <div class="detail-card-header">
 *           <h4 class="detail-card-title">Title</h4>
 *       </div>
 *       <p class="detail-card-subtitle">Subtitle</p>
 *       <div class="detail-card-canvas-wrap">
 *           <canvas class="chart-clickable">
 *       </div>
 *   </div>
 *
 * @param {string} title – Card title
 * @param {string|null} subtitle – Optional subtitle
 * @param {boolean} withCanvas – Include canvas for Chart.js visualization
 * @returns {object} { card: HTMLElement|null, canvas: HTMLCanvasElement|null }
 */
function createDetailCard(title, subtitle, withCanvas = true) {
    const container = document.getElementById('detail-charts');
    if (!container) return { card: null, canvas: null };

    // Create card wrapper
    const card = document.createElement('div');
    card.className = 'detail-card';

    // Create header
    const header = document.createElement('div');
    header.className = 'detail-card-header';

    const titleEl = document.createElement('h4');
    titleEl.className = 'detail-card-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    // Add subtitle if provided
    if (subtitle) {
        const subEl = document.createElement('p');
        subEl.className = 'detail-card-subtitle';
        subEl.innerHTML = subtitle;

        card.appendChild(header);
        card.appendChild(subEl);
    } else {
        card.appendChild(header);
    }

    let canvas = null;

    // Add canvas if requested
    if (withCanvas) {
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'detail-card-canvas-wrap';

        canvas = document.createElement('canvas');
        canvas.classList.add('chart-clickable');
        canvas.dataset.chartTitle = title;
        canvas.addEventListener('click', () => openChartModalFromCanvas(canvas));

        canvasWrapper.appendChild(canvas);
        card.appendChild(canvasWrapper);
    }

    container.appendChild(card);
    return { card, canvas };
}

/* ---------------------------------------------------------------------------
 * SECTION 6: KPI DATA STRUCTURES & SAMPLE DATA
 * ---------------------------------------------------------------------------*/

// /**
//  * 6.1: Sample KPI data generation
//  * Current approach: Synthetic daily data based on mathematical progressions
//  * Future: Replace with API-driven data from backend
//  *
//  * Structure:
//  *   - Current period (October): daily values
//  *   - Previous period (September): daily values for comparison
//  *   - Derived metrics: ROAS = Revenue/Spend, ROI = (Revenue-Spend)/Spend * 100
//  */

// const DAYS_IN_MONTH = 30;
// const dayIndexes = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i); // 0..29

// // 6.2: Daily revenue (₹) – gentle upward trend
// const revenueCurrent = dayIndexes.map(d => 110000 + d * 1500);  // October: starting ₹110k, +₹1.5k daily
// const revenuePrevious = dayIndexes.map(d => 100000 + d * 1300); // September: starting ₹100k, +₹1.3k daily

// // 6.3: Daily ad spend (₹)
// const spendCurrent = dayIndexes.map(d => 35000 + d * 400);  // October spend
// const spendPrevious = dayIndexes.map(d => 32000 + d * 350); // September spend

// // 6.4: Derived ROAS (Revenue / Spend) – mathematically consistent
// const roasCurrent = revenueCurrent.map((rev, idx) => rev / spendCurrent[idx]);
// const roasPrevious = revenuePrevious.map((rev, idx) => rev / spendPrevious[idx]);

// // 6.5: Derived ROI (%) = ((Revenue - Spend) / Spend) * 100
// const roiCurrent = revenueCurrent.map(
//     (rev, idx) => ((rev - spendCurrent[idx]) / spendCurrent[idx]) * 100
// );
// const roiPrevious = revenuePrevious.map(
//     (rev, idx) => ((rev - spendPrevious[idx]) / spendPrevious[idx]) * 100
// );

// /**
//  * 6.6: Master KPI data structure
//  * NOTE: When API integration is complete, sampleData will be populated from API responses
//  * Expected API response structure:
//  *   { revenue: { current: [...], previous: [...] },
//  *     spend: { current: [...], previous: [...] },
//  *     roas: { current: [...], previous: [...] },
//  *     roi: { current: [...], previous: [...] } }
//  */
// const sampleData = {
//     revenue: {
//         current: revenueCurrent,   // October daily values
//         previous: revenuePrevious  // September daily values
//     },
//     spend: {
//         current: spendCurrent,
//         previous: spendPrevious
//     },
//     roas: {
//         current: roasCurrent,
//         previous: roasPrevious
//     },
//     roi: {
//         current: roiCurrent,
//         previous: roiPrevious
//     }
// };

/* ---------------------------------------------------------------------------
 * SECTION 7: KPI HELPER FUNCTIONS
 * ---------------------------------------------------------------------------*/

/**
 * 7.1: Sum array values up to a given day (Year-to-Date calculation)
 * Used to aggregate daily metrics into cumulative period totals
 * Example: sumToDate([100, 200, 300], 2) → 300 (100 + 200)
 *
 * @param {number[]} arr – Array of daily values
 * @param {number} day – Days to sum through (1-indexed)
 * @returns {number} Sum of values
 */
function sumToDate(arr, day) {
    const end = Math.min(day, arr.length);
    return arr.slice(0, end).reduce((a, b) => a + b, 0);
}

/**
 * 7.2: Average array values up to a given day
 * Used for averaging ratios (ROAS, ROI, CAC) where sum doesn't make sense
 * Example: avgToDate([2.5, 3.0, 2.8], 3) → 2.767
 *
 * @param {number[]} arr – Array of daily values
 * @param {number} day – Days to average through (1-indexed)
 * @returns {number} Average of values (0 if empty)
 */
function avgToDate(arr, day) {
    const end = Math.min(day, arr.length);
    if (end === 0) return 0;
    return arr.slice(0, end).reduce((a, b) => a + b, 0) / end;
}

/**
 * 7.3: Apply KPI percentage change formatting to an element
 * Displays: arrow (▲/▼) + sign (+/-) + percentage value
 * Styling: CSS classes for color coding (green = good, red = bad)
 *
 * invert parameter: Use true for metrics where "up is bad"
 *   - False (default): Revenue up = good (green), Spend up = bad (red)
 *   - True: Spend up = bad (red), CAC up = bad (red)
 *
 * @param {HTMLElement} el – Element to update
 * @param {number} pct – Percentage change (can be negative)
 * @param {boolean} invert – Flip interpretation (true for "up is bad" metrics)
 */
function applyChange(el, pct, invert = false) {
    const isUp = pct >= 0;
    const good = invert ? !isUp : isUp; // Flip logic if invert=true

    const arrow = isUp ? '▲' : '▼';
    const cls = good ? 'up' : 'down';
    const sign = pct >= 0 ? '+' : '';

    el.classList.remove('up', 'down');
    el.classList.add(cls);
    el.textContent = `${arrow} ${sign}${pct.toFixed(1)}%`;
}

/**
 * 7.4: Create a mini sparkline chart for KPI cards
 * Lightweight line chart with no axes, no legend, no tooltips
 * Perfect for showing daily trend in KPI header
 *
 * @param {CanvasRenderingContext2D} ctx – Canvas context from KPI card
 * @param {number[]} values – Array of daily metric values
 * @param {string} strokeColor – Line color (e.g., SCALEX_COLORS.kpiRevenue)
 * @param {string} fillColor – Area fill color (e.g., SCALEX_COLORS.kpiRevenueFill)
 * @returns {Chart} Chart.js instance
 */
function createSparkline(ctx, values, strokeColor, fillColor) {
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: values.map((_, i) => i + 1), // Day 1, Day 2, etc.
            datasets: [
                {
                    data: values,
                    borderColor: strokeColor,
                    backgroundColor: fillColor,
                    fill: true,
                    tension: 0.35,    // Smooth curve
                    borderWidth: 1,
                    pointRadius: 0,   // No visible points
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },    // No legend
                tooltip: { enabled: false }    // No tooltips
            },
            scales: {
                x: { display: false },   // No axes
                y: { display: false }
            }
        }
    });

    return chart;
}

/* ---------------------------------------------------------------------------
 * SECTION 8: KPI CARD RENDERING
 * ---------------------------------------------------------------------------*/

/**
 * 8.1: Render all KPI cards (Revenue, Spend, ROAS, ROI)
 * For each KPI:
 *   1. Calculate YTD (Year-to-Date) value from daily array
 *   2. Compare to previous period
 *   3. Compute percentage change
 *   4. Apply styling (arrow, color class)
 *   5. Render mini sparkline chart
 *   6. Update all DOM elements
 *
 * Called on:
 *   - Initial page load (DOMContentLoaded)
 *   - After API data updates
 *   - When date filter changes
 *
 * Assumptions:
 *   - DOM elements exist with expected IDs
 *   - Current date available via new Date().getDate()
 *   - sampleData structure is populated (from API or synthetic)
 */
function renderKpiCards() {
    // Use today's date as cutoff (live data updates through today)
    const today = new Date().getDate();

    // ===== REVENUE KPI =====
    {
        const { current, previous } = sampleData.revenue;
        const currVal = sumToDate(current, today);      // YTD current
        const prevVal = sumToDate(previous, today);     // YTD previous
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        // Update DOM elements
        document.getElementById('rev-current').textContent = '₹ ' + formatNumber(currVal);
        document.getElementById('rev-prev').textContent = 'Prev: ₹ ' + formatNumber(prevVal);

        const changeEl = document.getElementById('rev-change');
        applyChange(changeEl, pct, false); // Up is good for revenue

        // Render sparkline
        const ctx = document.getElementById('rev-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRevenue, SCALEX_COLORS.kpiRevenueFill);
    }

    // ===== SPEND KPI =====
    {
        const { current, previous } = sampleData.spend;
        const currVal = sumToDate(current, today);
        const prevVal = sumToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('spend-current').textContent = '₹ ' + formatNumber(currVal);
        document.getElementById('spend-prev').textContent = 'Prev: ₹ ' + formatNumber(prevVal);

        const changeEl = document.getElementById('spend-change');
        applyChange(changeEl, pct, true); // Up is bad for spend (invert=true)

        const ctx = document.getElementById('spend-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiSpend, SCALEX_COLORS.kpiSpendFill);
    }

    // ===== ROAS KPI =====
    {
        const { current, previous } = sampleData.roas;
        const currVal = avgToDate(current, today);     // Use average for ratios
        const prevVal = avgToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('roas-current').textContent = formatOneDecimal(currVal) + 'x';
        document.getElementById('roas-prev').textContent = 'Prev: ' + formatOneDecimal(prevVal) + 'x';

        const changeEl = document.getElementById('roas-change');
        applyChange(changeEl, pct, false); // Up is good for ROAS

        const ctx = document.getElementById('roas-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRoas, SCALEX_COLORS.kpiRoasFill);
    }

    // ===== ROI KPI =====
    {
        const { current, previous } = sampleData.roi;
        const currVal = avgToDate(current, today);
        const prevVal = avgToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('roi-current').textContent = formatOneDecimal(currVal) + '%';
        document.getElementById('roi-prev').textContent = 'Prev: ' + formatOneDecimal(prevVal) + '%';

        const changeEl = document.getElementById('roi-change');
        applyChange(changeEl, pct, false); // Up is good for ROI

        const ctx = document.getElementById('roi-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRoi, SCALEX_COLORS.kpiRoiFill);
    }
}

// ---------------------------------------------------------------------
// SMART ALERTS – Helper: severity + icon mappings
// ---------------------------------------------------------------------

function mapSeverityToClasses(severity) {
    switch (severity) {
        case 'positive':
            return {
                highlightClass: 'alert-highlight-green',
                symbolClass: 'alert-symbol--green',
                fallbackIcon: '▲'
            };
        case 'warning':
            return {
                highlightClass: 'alert-highlight-amber',
                symbolClass: 'alert-symbol--amber',
                fallbackIcon: '⚠'
            };
        case 'negative':
            return {
                highlightClass: 'alert-highlight-red',
                symbolClass: 'alert-symbol--red',
                fallbackIcon: '▼'
            };
        case 'info':
        default:
            return {
                highlightClass: 'alert-highlight-sky',
                symbolClass: 'alert-symbol--sky',
                fallbackIcon: '★'
            };
    }
}

function mapIconCode(icon) {
    // icon from backend: "up" | "down" | "warn" | "star"
    switch (icon) {
        case 'up':   return '▲';
        case 'down': return '▼';
        case 'warn': return '⚠';
        case 'star': return '★';
        case 'flat': return '▶';
        default:     return '';
    }
}

function mapIconColor(icon) {
    // icon from backend: "up" | "down" | "warn" | "star"
    switch (icon) {
        case 'up':   return 'alert-symbol--green';
        case 'down': return 'alert-symbol--red';
        case 'warn': return 'alert-symbol--amber';
        case 'star': return 'alert-symbol--sky';
        case 'flat': return 'alert-symbol--sky';
        default:     return 'alert-symbol--sky';
    }
}

/* ---------------------------------------------------------------------------
 * SECTION 9: PERFORMANCE OVERVIEW CHART DATA
 * ---------------------------------------------------------------------------*/

/**
 * 9.1: Funnel data – Spend → Revenue → ROI → ROAS
 * Shows progression metrics for Meta, Google, and LinkedIn
 * Used in first detail chart of Performance Overview
 */
const funnelData = {
    meta: [
        { stage: 'Spend',   value: 0 },   // ₹4.5L
        { stage: 'Revenue', value: 0 },  // ₹14L
        { stage: 'ROAS',    value: 0 },     // 3.11x multiplier
        { stage: 'ROI',     value: 0 }      // 211% return
    ],
    google: [
        { stage: 'Spend',   value: 0 },   // ₹6L
        { stage: 'Revenue', value: 0 },  // ₹22L
        { stage: 'ROAS',    value: 0 },     // 3.67x
        { stage: 'ROI',     value: 0 }      // 267%
    ],
    linkedin: [
        { stage: 'Spend',   value: 0 },   // ₹3L
        { stage: 'Revenue', value: 0 },   // ₹9L
        { stage: 'ROAS',    value: 0 },     // 3.0x
        { stage: 'ROI',     value: 0 }      // 200%
    ]
};

/**
 * 9.2: CAC trend data – May through October
 * Multiple series: blended vs paid, plus breakdown by channel
 * Used in charts: Blended CAC vs Paid CAC + CAC Trend by Channel
 */
const cacTrendData = {
    labels: [],
    blendedCAC: [],  // Blended (all channels)
    paidCAC:    [],  // Paid only
    metaCAC:    [],  // Meta-specific
    googleCAC:  [],  // Google-specific
    linkedinCAC:[]   // LinkedIn (more expensive)
};

/**
 * 9.3: Paid campaign ROI (%) by lead stage
 * Shows progression: Lead → MQL → SQL → Converted
 * Demonstrates how ROI improves as leads progress through funnel
 */
const paidCampaignRoiByStage = {
    labels: [],
    metaRoiPercent:      [],   // Meta ROI % at each stage
    googleRoiPercent:    [],   // Google ROI %
    linkedinRoiPercent:  []      // LinkedIn ROI %
};

/**
 * 9.4: Pipeline value attributed to marketing
 * Shows growth trajectory (May → Oct)
 * Approximately 3x monthly revenue (typical SaaS B2B ratio)
 */
const pipelineValueData = {
    labels: [],
    pipelineValue: []
};

/**
 * 9.5: LTV:CAC ratio summary
 * Single metric card (not a chart) – pure DOM
 * Shows: Ratio, avg LTV, avg CAC, health status
 */
const ltvCacSummary = {
    ltv: 0,     // Average lifetime value per customer (₹)
    cac: 0,      // Average customer acquisition cost (₹)
    ratio: 0,     // LTV:CAC ratio (3.4 : 1)
    status: 'healthy' // 'healthy' | 'warning' | 'risk'
};

/**
 * 9.6: LTV by cohort – Each quarterly cohort's average LTV
 * Shows improving customer quality over time
 */
const ltvCohortData = {
    cohorts: [],
    avgLtv:  []  // Q4 still in progress
};

/**
 * 9.7: Attribution accuracy – Actual model vs baseline
 * Shows improvement from 70% (May) to 86% (Oct)
 * Demonstrates model training progress
 */
const attributionAccuracyData = {
    labels: [],
    baseline: [],  // Static baseline (older model)
    actual:   []   // Improving accuracy (new model)
};

/**
 * 9.8: Top channels by ROAS – Ranked performance
 * Affiliate leads, followed by Google Search, Meta, Google Display, LinkedIn
 */
const topChannelsByRoas = {
    labels: [],
    roas:   []    // ROAS ratio (x multiplier)
};

/**
 * 9.9: New vs Repeat Revenue Mix – May through October
 * Trend: New customer share increasing (42% → 55%)
 * Parallel: Repeat share decreasing (58% → 45%)
 */
const revenueMixData = {
    months: [0],
    newPct: [0],    // % of revenue from new customers
    repeatPct: [0], // % of revenue from returning customers
    revenueNew:    [0],  // in ₹ Lakhs
    revenueRepeat: [0]   // in ₹ Lakhs
};

/* ---------------------------------------------------------------------------
 * SECTION 10: CHANNEL & CAMPAIGN ANALYTICS DATA
 * ---------------------------------------------------------------------------*/

/**
 * 10.1: Channel efficiency – CPL, CAC, ROAS by channel
 * Used in Channel-wise CPL/CAC/ROAS chart
 */
const channelEfficiencyData = {
    channels: [],
    cpl: [],  // Cost per lead (₹)
    cac: [],  // Cost per acquisition (₹)
    roas: []     // Return on ad spend (x)
};

/**
 * 10.2: Campaign-level ROI bubble data
 * Bubble size represents revenue
 * X-axis: ROI percentage
 * Y-axis: Spend in lakhs
 */
const campaignRoiBubbleData = [];

/**
 * 10.3: Creative performance summary – Three key metrics
 * CTR (Click-Through Rate), CPC (Cost Per Click), Engagement Rate
 * Each includes: latest value, delta vs previous, direction
 */
const creativePerformanceSummary = {
    ctr: {
        latest: 0,
        delta: 0,
        direction: '',   // ▲ (positive)
        unit: ''
    },
    cpc: {
        latest: 0,
        delta: 0,        // Actually 12% decrease (negative delta)
        direction: '', // ▼ (negative)
        unit: ''
    },
    engagement: {
        latest: 0,
        delta: 0,
        direction: '',
        unit: ''
    }
};

/**
 * 10.4: Audience segment ROAS
 * ROAS for different audience types
 */
const audienceRoasData = {
    labels: [],
    roas:   []  // ROAS by segment
};

/**
 * 10.5: Lead quality score by channel
 * 0–100 scale based on CRM pipeline outcomes
 * Color-coded: Good (80+) | Warning (70–79) | Bad (0–69)
 */
const leadQualityData = {
    channels: [],
    scores:   []  // Quality scores
};

/**
 * 10.6: Spend efficiency – Share comparison
 * Compare: What % of spend going to each channel vs what % of revenue they generate
 * Example: Google gets 38% of spend but generates 43% of revenue (efficient)
 */
const spendEfficiencyData = {
    channels:    [],
    spendShare:  [],  // % of total spend
    revenueShare:[]   // % of total revenue
};

/**
 * 10.7: Touch-point revenue split
 * Attribution: First touch, Mid-funnel touch, Last touch
 * Shows which touchpoints get credit in different attribution models
 */
const touchPointSplitData = {
    channels: [],
    first:    [],   // % of first-touch conversions
    mid:      [],   // % of mid-funnel assists
    last:     []    // % of last-touch conversions
};

/**
 * 10.8: Channel performance table
 * Summary of all key metrics by channel
 * Used for: Detail card + CSV export
 */
const channelPerformanceTableData = [
    {
        channel: '',
        spend: 0,
        revenue: 0,
        cpl: 0,
        cac: 0,
        roas: 0,
        roi: 0,
        leadQuality: 0
    },
];

/* ---------------------------------------------------------------------------
 * SECTION 11: DETAIL CHART RENDERING FUNCTIONS
 * ---------------------------------------------------------------------------*/

/**
 * 11.1: Render Performance Overview detail section
 * Contains 10+ charts covering funnel, CAC, pipeline, LTV, attribution, etc.
 * Called when Performance Overview tab is active
 *
 * Chart list (in order):
 *   1. Spend → Revenue → ROI → ROAS (funnel by channel)
 *   2. Blended CAC vs Paid CAC (trend lines)
 *   3. Meta · Google · LinkedIn CAC Trends
 *   4. Paid Campaign ROI by Stage (Lead → SQL → Converted)
 *   5. Pipeline Value (horizontal bar chart)
 *   6. LTV:CAC Ratio (pure DOM card)
 *   7. LTV by Cohort (horizontal bar)
 *   8. Attribution Accuracy Rate
 *   9. Top Channels by ROAS
 *   10. New vs Repeat Revenue Mix (100% stacked)
 */
function renderPerformanceOverviewDetails() {
    clearDetailCharts();
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }

    const metaColor = SCALEX_COLORS.meta;
    const googleColor = SCALEX_COLORS.google;
    const linkedinColor = SCALEX_COLORS.linkedin;

    // ===== CHART 1: Spend → Revenue → ROI → ROAS (Funnel) =====
    (function () {
        const meta = funnelData.meta;
        const google = funnelData.google;
        const linkedin = funnelData.linkedin;
        const stages = ['Spend', 'Revenue', 'ROI', 'ROAS'];

        // Build lookups: stage name → value
        const metaByStage = meta.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});
        const googleByStage = google.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});
        const linkedinByStage = linkedin.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});

        // Separate datasets for money axis (₹) vs ratio axis (%)
        // Money: Spend + Revenue on left axis
        const metaMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? metaByStage[stage] ?? null : null
        );
        const googleMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? googleByStage[stage] ?? null : null
        );
        const linkedinMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? linkedinByStage[stage] ?? null : null
        );

        // Ratios: ROI + ROAS on right axis (convert to %)
        const metaRatio = stages.map(stage => {
            if (stage === 'ROI' || stage === 'ROAS') {
                const v = metaByStage[stage];
                return v != null ? v * 100 : null; // e.g. 2.7 → 270
            }
            return null;
        });

        const googleRatio = stages.map(stage => {
            if (stage === 'ROI' || stage === 'ROAS') {
                const v = googleByStage[stage];
                return v != null ? v * 100 : null;
            }
            return null;
        });

        const linkedinRatio = stages.map(stage => {
            if (stage === 'ROI' || stage === 'ROAS') {
                const v = linkedinByStage[stage];
                return v != null ? v * 100 : null;
            }
            return null;
        });

        const { canvas } = createDetailCard(
            'Spend → Revenue → ROI → ROAS',
            'Comparison of Meta, Google & LinkedIn funnel performance'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stages,
                datasets: [
                    // Money (₹) – left axis
                    {
                        label: 'Meta',
                        data: metaMoney,
                        yAxisID: 'y',
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Google',
                        data: googleMoney,
                        yAxisID: 'y',
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1
                    },
                    {
                        label: 'LinkedIn',
                        data: linkedinMoney,
                        yAxisID: 'y',
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1
                    },

                    // Ratios (%) – right axis, hidden from legend
                    {
                        label: 'Meta (ratio)',
                        data: metaRatio,
                        yAxisID: 'y1',
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Google (ratio)',
                        data: googleRatio,
                        yAxisID: 'y1',
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1
                    },
                    {
                        label: 'LinkedIn (ratio)',
                        data: linkedinRatio,
                        yAxisID: 'y1',
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON,
                        labels: {
                            ...SCALEX_LEGEND_COMMON.labels,
                            // Hide "(ratio)" datasets from legend
                            filter: function (item) {
                                return !item.text.includes('(ratio)');
                            }
                        },
                        // Sync ratio datasets when legend is clicked
                        onClick: function (e, legendItem, legend) {
                            const chart = legend.chart;
                            const index = legendItem.datasetIndex;

                            let ratioIndex = null;
                            if (index === 0) ratioIndex = 3; // Meta ratio
                            if (index === 1) ratioIndex = 4; // Google ratio
                            if (index === 2) ratioIndex = 5; // LinkedIn ratio

                            const currentlyVisible = chart.isDatasetVisible(index);
                            chart.setDatasetVisibility(index, !currentlyVisible);

                            if (ratioIndex !== null) {
                                chart.setDatasetVisibility(ratioIndex, !currentlyVisible);
                            }

                            chart.update();
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const stage = ctx.label;
                                const raw = ctx.raw;
                                if (raw == null) return '';

                                const baseLabel = ctx.dataset.label.replace(' (ratio)', '');

                                if (stage === 'Spend' || stage === 'Revenue') {
                                    return `${baseLabel}: ${formatRupee(raw)}`;
                                }
                                if (stage === 'ROI') {
                                    return `${baseLabel}: ${raw.toFixed(1)}%`;
                                }
                                if (stage === 'ROAS') {
                                    const xVal = raw / 100; // back to ratio
                                    return `${baseLabel}: ${xVal.toFixed(2)}x`;
                                }
                                return `${baseLabel}: ${raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        position: 'left',
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return formatRupeeCompact(value);
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function (value) {
                                return `${value}%`;
                            }
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);
        
        // 💡 EXPORT FUNNEL CHART FOR API UPDATES
        window.scalexPerfFunnelChart = chart;
        window.scalexPerfFunnelStages = stages;
    })();

    // ===== CHART 2: Blended CAC vs Paid CAC =====
    (function () {
        const { labels, blendedCAC, paidCAC } = cacTrendData;
        const { canvas } = createDetailCard(
            'Blended CAC vs Paid CAC',
            'Customer acquisition cost trends over time'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Blended CAC',
                        data: blendedCAC,
                        tension: 0.2,
                        fill: false,
                        borderWidth: 2,
                        borderColor: metaColor,
                        backgroundColor: metaColor
                    },
                    {
                        label: 'Paid CAC',
                        data: paidCAC,
                        tension: 0.2,
                        fill: false,
                        borderWidth: 2,
                        borderColor: googleColor,
                        backgroundColor: googleColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) =>
                                `${ctx.dataset.label}: ${formatRupee(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => formatRupee(value)
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexBlendedPaidCACChart = chart;
    })();

    // ===== CHART 3: Meta · Google · LinkedIn CAC Trends =====
    (function () {
        const { labels, metaCAC, googleCAC, linkedinCAC } = cacTrendData;
        const { canvas } = createDetailCard(
            'CAC Trend – Meta · Google · LinkedIn',
            'Customer acquisition cost by channel over time'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Meta CAC',
                        data: metaCAC,
                        tension: 0.2,
                        fill: false,
                        borderWidth: 2,
                        borderColor: metaColor,
                        backgroundColor: metaColor
                    },
                    {
                        label: 'Google CAC',
                        data: googleCAC,
                        tension: 0.2,
                        fill: false,
                        borderWidth: 2,
                        borderColor: googleColor,
                        backgroundColor: googleColor
                    },
                    {
                        label: 'LinkedIn CAC',
                        data: linkedinCAC,
                        tension: 0.2,
                        fill: false,
                        borderWidth: 2,
                        borderColor: linkedinColor,
                        backgroundColor: linkedinColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatRupee(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => formatRupee(value)
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexCacTrendByChannelChart = chart;
    })();

    // ===== CHART 4: Paid Campaign ROI by Stage =====
    (function () {
        const { labels, metaRoiPercent, googleRoiPercent, linkedinRoiPercent } = paidCampaignRoiByStage;
        const { canvas } = createDetailCard(
            'Paid Campaign ROI (%) by Stage',
            'ROI across Lead → MQL → SQL → Converted'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Meta',
                        data: metaRoiPercent,
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Google',
                        data: googleRoiPercent,
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1
                    },
                    {
                        label: 'LinkedIn',
                        data: linkedinRoiPercent,
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(0)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexPaidRoiByStageChart = chart;
    })();

    // ===== CHART 5: Pipeline Value (Horizontal Bar) =====
    (function () {
        const { labels, pipelineValue } = pipelineValueData;
        const { canvas } = createDetailCard(
            'Pipeline Value Attributed to Marketing',
            'Marketing-influenced pipeline over time (₹)'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Pipeline (₹)',
                        data: pipelineValue,
                        borderWidth: 1,
                        borderColor: metaColor,
                        backgroundColor: metaColor
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) =>
                                formatRupee(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₹${(value / 100000).toFixed(1)}L`
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexPipelineValueChart = chart;
    })();

    // ===== CARD 6: LTV:CAC Ratio (Pure DOM) =====
    (function () {
        const { ltv, cac, ratio, status } = ltvCacSummary;
        const { card } = createDetailCard(
            'LTV : CAC Ratio',
            null,
            false // No canvas
        );
        if (!card) return;

        const body = document.createElement('div');
        body.className = 'detail-ltv-body';
        body.dataset.chartId = 'perf_ltv_cac_ratio';

        const ratioEl = document.createElement('div');
        ratioEl.className = 'detail-ltv-ratio';
        ratioEl.textContent = `${ratio.toFixed(1)} : 1`;

        const subEl = document.createElement('p');
        subEl.className = 'detail-ltv-subtext';
        subEl.textContent =
            `Avg LTV: ${formatRupee(ltv)} · CAC: ${formatRupee(cac)}`;

        const badge = document.createElement('span');
        badge.className = `detail-ltv-badge detail-ltv-badge--${status}`;
        badge.textContent =
            status === 'healthy' ? 'Healthy' :
            status === 'warning' ? 'Watch' : 'At Risk';

        body.appendChild(ratioEl);
        body.appendChild(subEl);
        body.appendChild(badge);

        card.appendChild(body);
    })();

    // ===== CHART 7: LTV by Cohort =====
    (function () {
        const { cohorts, avgLtv } = ltvCohortData;
        const { canvas } = createDetailCard(
            'Customer Lifetime Value by Cohort',
            'Average LTV per acquisition cohort (₹)'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: cohorts,
                datasets: [
                    {
                        label: 'Avg LTV (₹)',
                        data: avgLtv,
                        borderWidth: 1,
                        borderColor: googleColor,
                        backgroundColor: googleColor
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => formatRupee(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₹${(value / 1000).toFixed(0)}k`
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexLtvByCohortChart = chart;
    })();

    // ===== CHART 8: Attribution Accuracy Rate =====
    (function () {
        const { labels, baseline, actual } = attributionAccuracyData;
        const { canvas } = createDetailCard(
            'Attribution Accuracy Rate',
            'Accuracy vs baseline model (%)'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Baseline',
                        data: baseline,
                        tension: 0,
                        borderWidth: 1,
                        fill: false,
                        backgroundColor: metaColor,
                        borderColor: metaColor
                    },
                    {
                        label: 'Actual',
                        data: actual,
                        tension: 0.3,
                        borderWidth: 2,
                        fill: false,
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexAttributionAccuracyChart = chart;
    })();

    // ===== CHART 9: Top Channels by ROAS =====
    (function () {
        const { labels, roas } = topChannelsByRoas;
        const { canvas } = createDetailCard(
            'Top Performing Channels by ROAS',
            'Ranked by Return on Ad Spend'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'ROAS (x)',
                        data: roas,
                        borderWidth: 1,
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.toFixed(2)}x`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexTopChannelsRoasChart = chart;
    })();

    // ===== CHART 10: New vs Repeat Revenue Mix =====
    (function () {
        // You can still use static revenueMixData as initial state / fallback
        const { months, newPct, repeatPct, revenueNew, revenueRepeat } = revenueMixData;
        const { canvas } = createDetailCard(
            'New vs Repeat Revenue Mix',
            'Share of revenue contributed by new vs returning customers'
        );
        if (!canvas) return;
    
        const ctx = canvas.getContext('2d');
    
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'New Customers',
                        data: newPct,
                        backgroundColor: metaColor
                    },
                    {
                        label: 'Repeat Customers',
                        data: repeatPct,
                        backgroundColor: linkedinColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const i = items[0].dataIndex;
                                const labels = items[0].chart.data.labels || [];
                                const label = labels[i] ?? '';
                                return `${label} 2025`;
                            },
                            label: (ctx) => {
                                const idx = ctx.dataIndex;
                                const chartInstance = ctx.chart;
                            
                                // ✅ Read dynamic revenue arrays from chart instance
                                const tooltipRev = chartInstance.__tooltipRevenue || {};
                                const revNewArr = tooltipRev.new || [];
                                const revRepeatArr = tooltipRev.repeat || [];
                            
                                // % values should always come from dataset's own data
                                const pctVal = ctx.dataset.data?.[idx];
                            
                                if (ctx.dataset.label.includes('New')) {
                                    const pct = pctVal != null ? `${pctVal}%` : 'N/A';
                                    const rev = revNewArr[idx];
                                    const revStr = rev != null ? `₹ ${rev.toFixed(1)}L` : '₹ N/A';
                                    return `New: ${pct} (${revStr})`;
                                }
                            
                                if (ctx.dataset.label.includes('Repeat')) {
                                    const pct = pctVal != null ? `${pctVal}%` : 'N/A';
                                    const rev = revRepeatArr[idx];
                                    const revStr = rev != null ? `₹ ${rev.toFixed(1)}L` : '₹ N/A';
                                    return `Repeat: ${pct} (${revStr})`;
                                }
                            
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            color: 'rgba(255,255,255,0.04)'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (v) => `${v}%`
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.07)'
                        }
                    }
                }
            }
        });
    
        // 🔹 Default tooltip revenue for initial static state (optional)
        chart.__tooltipRevenue = {
            new: revenueNew || [],
            repeat: revenueRepeat || []
        };
    
        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);
    
        // 🔁 export for API updates
        window.scalexNewVsRepeatMixChart = chart;
    })();
}

/**
 * 11.2: Render Channel & Campaign Analytics detail section
 * Contains 8+ charts covering channel efficiency, campaign ROI, audience segments, etc.
 * Called when Channel Analytics tab is active
 *
 * Chart list (in order):
 *   1. Channel-wise CPL · CAC · ROAS
 *   2. Campaign ROI & Incremental ROAS (bubble chart)
 *   3. Touch-Point Revenue Split
 *   4. Audience Segment ROAS
 *   5. Lead Quality Score by Channel
 *   6. Spend Efficiency Index by Channel
 *   7. Creative Performance (CTR · CPC · Engagement)
 *   8. Channel Performance Snapshot (table + CSV export)
 */
function renderChannelCampaignDetails() {
    clearDetailCharts();
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }

    const metaColor = SCALEX_COLORS.meta;
    const googleColor = SCALEX_COLORS.google;
    const linkedinColor = SCALEX_COLORS.linkedin;

    // ===== CHART 1: Channel-wise CPL · CAC · ROAS =====
    (function () {
        const { channels, cpl, cac, roas } = channelEfficiencyData;
        const { canvas } = createDetailCard(
            'Channel-wise CPL · CAC · ROAS',
            'CPL & CAC in ₹ (bottom axis), ROAS on hidden secondary axis'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    {
                        label: 'CPL (₹)',
                        data: cpl,
                        backgroundColor: metaColor,
                        xAxisID: 'x1'
                    },
                    {
                        label: 'CAC (₹)',
                        data: cac,
                        backgroundColor: googleColor,
                        xAxisID: 'x1'
                    },
                    {
                        label: 'ROAS (x)',
                        data: roas,
                        backgroundColor: linkedinColor,
                        xAxisID: 'x2'
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const label = ctx.dataset.label || '';
                                const value = ctx.raw;

                                if (label.includes('CPL')) return `${label}: ${formatRupee(value)}`;
                                if (label.includes('CAC')) return `${label}: ${formatRupee(value)}`;
                                if (label.includes('ROAS')) return `${label}: ${value.toFixed(2)}x`;

                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x1: {
                        beginAtZero: true,
                        position: 'bottom',
                        ticks: {
                            callback: v => formatRupee(v)
                        },
                        grid: {
                            display: true,
                            color: 'rgba(255,255,255,0.05)'
                        }
                    },
                    x2: {
                        beginAtZero: true,
                        position: 'bottom',
                        display: false,
                        ticks: { display: false },
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexChannelCplCacRoasChart = chart;
    })();

    // ===== CHART 2: Campaign ROI & Incremental ROAS (Bubble) =====
    (function () {
        const { canvas } = createDetailCard(
            'Campaign ROI & Incremental ROAS',
            'Bubble size = revenue; X = ROI%; Y = spend'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const dataPoints = campaignRoiBubbleData.map(c => ({
            x: c.roi,
            y: c.spendLakh,
            r: Math.max(8, Math.sqrt(c.revenueLakh) * 3),
            _meta: c
        }));

        const chart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [
                    {
                        label: 'Campaigns',
                        data: dataPoints,
                        backgroundColor: SCALEX_COLORS.bubbleFill,
                        borderColor: SCALEX_COLORS.bubbleStroke,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const m = ctx.raw._meta;
                                return [
                                    m.name,
                                    `Channel: ${m.channel}`,
                                    `Spend: ₹ ${m.spendLakh.toFixed(1)}L`,
                                    `Revenue: ₹ ${m.revenueLakh.toFixed(1)}L`,
                                    `ROI: ${m.roi.toFixed(0)}%`,
                                    `Incremental ROAS: +${m.incrRoas.toFixed(0)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'ROI (%)' },
                        beginAtZero: false
                    },
                    y: {
                        title: { display: true, text: 'Spend (₹L)' },
                        beginAtZero: true
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexCampaignRoiBubbleChart = chart;
    })();

    // ===== CHART 3: Touch-Point Revenue Split =====
    (function () {
        const { channels, first, mid, last } = touchPointSplitData;
        const { canvas } = createDetailCard(
            'Touch-Point Revenue Split',
            'Share of revenue by first, mid, and last touch'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    {
                        label: 'First Touch',
                        data: first,
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Mid Touch',
                        data: mid,
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1
                    },
                    {
                        label: 'Last Touch',
                        data: last,
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(0)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: v => `${v}%`
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexTouchpointSplitChart = chart;
    })();

    // ===== CHART 4: Audience Segment ROAS =====
    (function () {
        const { labels, roas } = audienceRoasData;
        const { canvas } = createDetailCard(
            'Audience Segment ROAS',
            'New vs Repeat vs Lookalike vs Remarketing'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'ROAS (x)',
                        data: roas,
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.toFixed(2)}x`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexAudienceRoasChart = chart;
    })();

    // ===== CHART 5: Lead Quality Score by Channel =====
    (function () {
        const { channels, scores } = leadQualityData;
        const { card, canvas } = createDetailCard(
            'Lead Quality Score by Channel',
            '0–100 score based on CRM pipeline outcomes, <br>\
            <span style="color: #22C55E; font-weight: 600;">Good (80–100)</span> - \
            <span style="color: #FBBF24; font-weight: 600;">Warning (70–79)</span> - \
            <span style="color: #F97373; font-weight: 600;">Bad (0–69)</span>'
        );
        if (!canvas || !card) return;

        const ctx = canvas.getContext('2d');

        // Map score → color
        const getScoreColor = (score) => {
            if (score >= 80) return SCALEX_COLORS.good;     // green
            if (score >= 70) return SCALEX_COLORS.warning;  // amber
            return SCALEX_COLORS.bad;                       // red
        };

        const barColors = scores.map(getScoreColor);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    {
                        label: 'Lead quality score',
                        data: scores,
                        backgroundColor: barColors,
                        borderColor: barColors,
                        borderWidth: 1,
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 8, right: 24, bottom: 18, left: 8 }
                },
                plugins: {
                    legend: {
                        display: false   // 🔕 legend handled in DOM
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.raw;
                                return `${ctx.label}: ${value.toFixed(0)}/100`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        offset: true,          // centers bars nicely
                        grid: {
                            display: false
                        },
                        ticks: {
                            padding: 10
                        }
                    },
                    x: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255,255,255,0.08)'
                        }
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexLeadQualityChart = chart;
    })();



    // ===== CHART 6: Spend Efficiency Index =====
    (function () {
        const { channels, spendShare, revenueShare } = spendEfficiencyData;
        const { canvas } = createDetailCard(
            'Spend Efficiency Index by Channel',
            'Compare spend share vs revenue share'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    {
                        label: 'Spend %',
                        data: spendShare,
                        backgroundColor: SCALEX_COLORS.neutralBar,
                        borderColor: SCALEX_COLORS.neutralBar,
                        borderWidth: 1
                    },
                    {
                        label: 'Revenue %',
                        data: revenueShare,
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        ...SCALEX_LEGEND_COMMON
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const label = ctx.dataset.label || '';
                                const v = ctx.raw;
                                return `${label}: ${v.toFixed(1)}%`;
                            },
                            footer: (items) => {
                                const i = items[0].dataIndex;
                                const spend = spendShare[i];
                                const rev = revenueShare[i];
                                const index = rev - spend;
                                const sign = index >= 0 ? '+' : '';
                                return `Index: ${sign}${index.toFixed(1)} pts`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 60
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);

        // 🔁 export for API updates
        window.scalexSpendEfficiencyChart = chart;
    })();

    // ===== CARD 7: Creative Performance (Metric Tiles) =====
    (function () {
        const { card } = createDetailCard(
            'Creative Performance',
            'CTR · CPC · Engagement (last 30 days)',
            false // No canvas
        );
        if (!card) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'metric-tiles-wrapper';

        /**
         * Helper to create a single metric tile
         */
        function makeTile(title, metric) {
            const tile = document.createElement('div');
            tile.className = 'metric-tile';

            const titleEl = document.createElement('p');
            titleEl.className = 'metric-tile-title';
            titleEl.textContent = title;

            const valueEl = document.createElement('p');
            valueEl.className = 'metric-tile-value';
            valueEl.textContent = `${metric.latest}${metric.unit}`;

            const deltaEl = document.createElement('p');
            deltaEl.className = 'metric-tile-delta';
            const arrow = mapIconCode(metric.direction);
            const colorClass = mapIconColor(metric.direction);
            deltaEl.classList.add(colorClass);

            // const absDelta = Math.abs(metric.delta);
            const absDelta = metric.delta;
            if (metric.unit !== '%') {
                deltaEl.textContent = `${arrow} ${absDelta.toFixed(1)}pp vs prev`;
            } else {
                deltaEl.textContent = `${arrow} ${absDelta.toFixed(0)}% vs prev`;
            }

            tile.appendChild(titleEl);
            tile.appendChild(valueEl);
            tile.appendChild(deltaEl);
            return tile;
        }

        wrapper.appendChild(makeTile('CTR', creativePerformanceSummary.ctr));
        wrapper.appendChild(makeTile('CPC', creativePerformanceSummary.cpc));
        wrapper.appendChild(makeTile('Engagement Rate', creativePerformanceSummary.engagement));

        card.appendChild(wrapper);
    })();

    // ===== CARD 8: Channel Performance Snapshot (Table) =====
    (function () {
        const { card } = createDetailCard(
            'Channel Performance Snapshot',
            'Spend, revenue, and efficiency metrics by channel',
            false // No canvas
        );
        if (!card) return;

        // Add CSV download button to card header
        const header = card.querySelector('.detail-card-header');
        if (header) {
            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'detail-card-download-btn';
            downloadBtn.title = 'Download as CSV';
            downloadBtn.innerHTML = '⭳';
            downloadBtn.addEventListener('click', downloadChannelPerformanceCSV);
            header.appendChild(downloadBtn);
        }

        // Create scrollable table wrapper
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'channel-performance-table-wrapper';

        const table = document.createElement('table');
        table.className = 'channel-performance-table';

        // Create header row
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Channel</th>
                <th>Spend</th>
                <th>Revenue</th>
                <th>CPL</th>
                <th>CAC</th>
                <th>ROAS</th>
                <th>ROI</th>
                <th>Lead Q.</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create data rows
        const tbody = document.createElement('tbody');

        channelPerformanceTableData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.channel}</td>
                <td>${formatRupee(row.spend)}</td>
                <td>${formatRupee(row.revenue)}</td>
                <td>${formatRupee(row.cpl)}</td>
                <td>${formatRupee(row.cac)}</td>
                <td>${row.roas.toFixed(2)}x</td>
                <td>${row.roi.toFixed(0)}%</td>
                <td>${row.leadQuality}</td>
            `;
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        scrollWrapper.appendChild(table);
        card.appendChild(scrollWrapper);
    })();
}

/* ---------------------------------------------------------------------------
 * SECTION 12: CHANNEL PERFORMANCE CSV EXPORT
 * ---------------------------------------------------------------------------*/

/**
 * 12.1: Download Channel Performance Snapshot table as CSV
 * Called from the CSV download button in the detail card header
 * 
 * CSV format:
 *   - Header row: Column names
 *   - Data rows: One row per channel
 *   - Escaping: Double-quotes for values containing commas/quotes
 */
function downloadChannelPerformanceCSV() {
    if (!Array.isArray(channelPerformanceTableData) || channelPerformanceTableData.length === 0) {
        console.warn('No channel performance data to export');
        return;
    }

    const headers = [
        'Channel',
        'Spend',
        'Revenue',
        'CPL',
        'CAC',
        'ROAS',
        'ROI',
        'LeadQuality'
    ];

    const rows = channelPerformanceTableData.map(row => [
        row.channel,
        row.spend,
        row.revenue,
        row.cpl,
        row.cac,
        row.roas,
        row.roi,
        row.leadQuality
    ]);

    const csvLines = [];

    // Add header row
    csvLines.push(headers.join(','));

    // Add data rows with basic CSV escaping
    rows.forEach(row => {
        const line = row
            .map(value => {
                if (value == null) return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            })
            .join(',');
        csvLines.push(line);
    });

    const csvContent = csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'channel_performance_snapshot.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------------
 * SECTION 13: SMART ALERTS INFRASTRUCTURE
 * ---------------------------------------------------------------------------*/

/**
 * 13.1: Smart alerts rendering
 * Placeholder for future implementation
 * 
 * When ready, this will include:
 *   - Alert data structures
 *   - Rendering functions
 *   - Dismissal handlers
 *   - Severity badges
 *   - Action CTAs
 * 
 * Example structure:
 *   const smartAlerts = [
 *       { message: '...', severity: 'high', action: '...', },
 *       ...
 *   ]
 *   function renderSmartAlerts() { ... }
 */

// Smart alerts rendering will be added here when backend integration is complete
