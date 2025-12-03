/* ============================================================================
 * ScaleX Dashboard Frontend Logic
 * - Global color palette
 * - Filter toggle + sidebar handling
 * - Dashboard export (PNG/PDF)
 * - Fullscreen chart modal (open/close/download)
 * - KPI cards (sample data + sparklines)
 * - Performance Overview detail charts
 * - Channel & Campaign Analytics detail charts
 * - CSV export for channel performance table
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * Global Palette (one place to change brand + chart colors)
 * ------------------------------------------------------------------------ */

const SCALEX_COLORS = {
    // Brand / channel colors (Meta / Google / LinkedIn)
    meta:           '#A78BFA', // Soft Violet
    google:         '#38BDF8', // Sky Blue
    linkedin:       '#34D399', // Emerald

    // KPI / metric accents
    kpiRevenue:     '#22C55E', // Revenue sparkline, "good" trend
    kpiSpend:       '#6366F1', // Spend sparkline
    kpiRoas:        '#FBBF24', // ROAS sparkline, warm highlight
    kpiRoi:         '#EC4899', // ROI sparkline, pink accent
    kpiRevenueFill: 'rgba(34,197,94,0.12)',
    kpiSpendFill:   'rgba(99,102,241,0.16)',
    kpiRoasFill:    'rgba(251,191,36,0.16)',
    kpiRoiFill:     'rgba(236,72,153,0.18)',

    // Neutral / helpers
    neutralBar:     '#9CA3AF', // Grey bars (Spend %, baseline, etc.)
    neutralAxis:    '#64748B', // Axis lines / text if needed
    tableBorder:    '#1F2937',

    // Traffic-light for quality / status
    good:           '#22C55E',
    warning:        '#FBBF24',
    bad:            '#F97373',

    // Bubble chart / special
    bubbleFill:     'rgba(129, 140, 248, 0.45)', // Indigo fill
    bubbleStroke:   'rgba(129, 140, 248, 0.95)'  // Indigo border
};

/* ---------------------------------------------------------------------------
 * Chart.js shared helpers (legend + unit formatting)
 * ------------------------------------------------------------------------ */

/**
 * Common legend styling for all charts that use point-style legends.
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
 * Convert pixels → millimetres (used for PDF export).
 * Assumes ~96 dpi, fine for UI exports.
 */
const PX_TO_MM = 25.4 / 96;

/**
 * Rupee tick formatter.
 */
function formatRupee(value) {
    return `₹${value.toLocaleString()}`;
}

/**
 * Rupee short formatter for lakhs / crores.
 *  - ≥ 1 Cr → "₹X.YCr"
 *  - ≥ 1 L  → "₹X.YL"
 *  - ≥ 1k   → "₹X.Yk"
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

/* ---------------------------------------------------------------------------
 * Notes for color usage (documentation only)
 * ------------------------------------------------------------------------ */
/*
Performance Overview page
    Funnel: SCALEX_COLORS.meta, .google, .linkedin
    Blended vs Paid CAC: SCALEX_COLORS.meta, .google
    CAC Trend by Channel: SCALEX_COLORS.meta, .google, .linkedin
    Paid Campaign ROI by Stage: SCALEX_COLORS.meta, .google, .linkedin
    Pipeline Value: SCALEX_COLORS.meta
    LTV by Cohort: SCALEX_COLORS.google
    Attribution Accuracy: baseline → SCALEX_COLORS.meta, actual → SCALEX_COLORS.google
    Top Channels by ROAS: SCALEX_COLORS.linkedin
    New vs Repeat Mix: new → SCALEX_COLORS.meta, repeat → SCALEX_COLORS.google
    KPI Sparklines:
        Revenue → SCALEX_COLORS.kpiRevenue
        Spend → SCALEX_COLORS.kpiSpend
        ROAS → SCALEX_COLORS.kpiRoas
        ROI → SCALEX_COLORS.kpiRoi

Channel & Campaign Analytics page
    Channel-wise CPL/CAC/ROAS: SCALEX_COLORS.meta / .google / .linkedin
    Campaign ROI Bubble: SCALEX_COLORS.bubbleFill / .bubbleStroke
    Touch-Point Split: SCALEX_COLORS.meta / .google / .linkedin
    Audience Segment ROAS: SCALEX_COLORS.google
    Lead Quality Score: SCALEX_COLORS.good / .warning / .bad
    Spend Efficiency Index: SCALEX_COLORS.neutralBar & .meta
*/

/* ============================================================================
 * DASHBOARD LAYOUT: filter toggle, sidebar routing, export hooks, modal hooks
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * Filter section toggle (accordion style)
 * ------------------------------------------------------------------------ */

window.toggleFilterSection = function () {
    const filterContent = document.getElementById('filter-content');
    const filterArrow = document.getElementById('filter-toggle-arrow');
    if (!filterContent || !filterArrow) return;

    const opening = filterContent.classList.contains('hidden');

    if (opening) {
        filterContent.classList.remove('hidden');
        filterArrow.setAttribute('data-lucide', 'chevron-up');
    } else {
        filterContent.classList.add('hidden');
        filterArrow.setAttribute('data-lucide', 'chevron-down');
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

/* ---------------------------------------------------------------------------
 * EXPORT: capture main-content to PNG or PDF (with margin + background)
 * ------------------------------------------------------------------------ */

async function exportDashboard(format) {
    try {
        if (!window.htmlToImage) {
            console.error('html-to-image not loaded');
            return;
        }

        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        const target = document.getElementById('main-content'); // only right-side content

        if (!target) {
            console.error('No #main-content found for export.');
            return;
        }

        // Hide filter section before capture for a cleaner export
        const filterSection = document.getElementById('filter-section');
        const prevDisplay = filterSection ? filterSection.style.display : null;
        if (filterSection) filterSection.style.display = 'none';

        // Ensure top of page is visible for full capture
        window.scrollTo(0, 0);

        // 1) Capture main-content as high-res PNG
        const rawDataUrl = await htmlToImage.toPng(target, {
            pixelRatio: 2,
            backgroundColor: '#164348'
        });

        // Restore filter visibility immediately after capture
        if (filterSection) filterSection.style.display = prevDisplay ?? '';

        // 2) Wrap PNG inside a canvas with uniform margin
        const MARGIN_PX = 40;
        const img = new Image();
        img.src = rawDataUrl;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.width + MARGIN_PX * 2;
        canvas.height = img.height + MARGIN_PX * 2;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#164348'; // match dashboard background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, MARGIN_PX, MARGIN_PX);

        const finalDataUrl = canvas.toDataURL('image/png');

        // --- PNG DOWNLOAD ---
        if (format === 'png') {
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = 'scalex-dashboard.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            return;
        }

        // --- PDF DOWNLOAD ---
        if (format === 'pdf') {
            if (!jsPDF) {
                console.error('jsPDF not available');
                return;
            }

            // Fit page to exact image size (no extra white space)
            const pdfWidth = canvas.width * PX_TO_MM;
            const pdfHeight = canvas.height * PX_TO_MM;
            const orientation = pdfWidth > pdfHeight ? 'l' : 'p';

            const pdf = new jsPDF({
                orientation,
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(finalDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('scalex-dashboard.pdf');
        }
    } catch (err) {
        console.error('Export failed:', err);
    }
}

/* ============================================================================
 * FULLSCREEN CHART MODAL (open / close / download)
 * ========================================================================== */

/**
 * Registry of all Chart instances by their canvas element.
 * Used to:
 *  - open charts in fullscreen
 *  - replicate their config in modal
 */
const scalexChartRegistry = new Map();

/**
 * Keep references to detail Chart.js instances for cleanup when changing view.
 */
const scalexDetailCharts = [];

// Modal state
let scalexModalChart = null;
let scalexModalSourceCanvas = null;
let scalexModalTitle = '';
let scalexModalSubtitle = '';

/* ---------------------------------------------------------------------------
 * Open fullscreen modal for a given chart canvas
 * ------------------------------------------------------------------------ */

function openChartModalFromCanvas(sourceCanvas) {
    const modal = document.getElementById('chart-modal');
    const modalCanvas = document.getElementById('chart-modal-canvas');
    const titleEl = document.getElementById('chart-modal-title');
    const subtitleEl = document.getElementById('chart-modal-subtitle');

    if (!modal || !modalCanvas) return;

    const srcChart = scalexChartRegistry.get(sourceCanvas);
    if (!srcChart) {
        console.warn('No chart registered for canvas', sourceCanvas);
        return;
    }

    // Destroy any previous modal chart
    if (scalexModalChart) {
        try {
            scalexModalChart.destroy();
        } catch (e) {
            // ignore
        }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = sourceCanvas;

    // Resolve title
    const title =
        sourceCanvas.dataset.chartTitle ||
        sourceCanvas.closest('.detail-card-title')?.textContent ||
        'Chart';

    // Resolve subtitle from same card, if present
    let subtitleText = '';
    const detailCard = sourceCanvas.closest('.detail-card');
    if (detailCard) {
        const subNode = detailCard.querySelector('.detail-card-subtitle');
        if (subNode) {
            subtitleText = subNode.textContent.trim();
        }
    }

    // Apply into modal DOM
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitleText;

    // Keep in JS state for export functions
    scalexModalTitle = title;
    scalexModalSubtitle = subtitleText;

    // Show modal container
    modal.classList.remove('hidden');

    // Resize modal canvas to container (double resolution for sharpness)
    const parent = modalCanvas.parentElement;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 500;
    modalCanvas.width = width * 2;
    modalCanvas.height = height * 2;

    const baseConfig = srcChart.config;
    const ctx = modalCanvas.getContext('2d');

    // Recreate chart with same type/data/options
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

/* ---------------------------------------------------------------------------
 * Close fullscreen chart modal and clean up chart instance
 * ------------------------------------------------------------------------ */

function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) modal.classList.add('hidden');

    if (scalexModalChart) {
        try {
            scalexModalChart.destroy();
        } catch (e) {
            // ignore
        }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = null;
    scalexModalTitle = '';
    scalexModalSubtitle = '';
}

/* ---------------------------------------------------------------------------
 * Download current modal chart as PNG or PDF (with title/subtitle)
 * ------------------------------------------------------------------------ */

function downloadModalChart(format) {
    if (!scalexModalChart) return;

    const chartCanvas = scalexModalChart.canvas;

    // Layout constants for export composition
    const PADDING = 40;          // Outer padding
    const TITLE_LINE = 26;       // px height for title line
    const SUBTITLE_LINE = 18;    // px height for subtitle line
    const TITLE_GAP = 8;         // Gap between title & subtitle
    const BLOCK_GAP = 12;        // Gap between subtitle block and chart

    const hasSubtitle = !!scalexModalSubtitle;

    // Compute total text block height
    let textBlockHeight = TITLE_LINE;
    if (hasSubtitle) {
        textBlockHeight += TITLE_GAP + SUBTITLE_LINE;
    }

    // Final export canvas dimensions
    const exportWidth = chartCanvas.width + PADDING * 2;
    const exportHeight = chartCanvas.height + PADDING * 2 + textBlockHeight + BLOCK_GAP;

    // Compose final image with dark background + text + chart
    const outCanvas = document.createElement('canvas');
    outCanvas.width = exportWidth;
    outCanvas.height = exportHeight;

    const ctx = outCanvas.getContext('2d');

    // Match fullscreen modal background
    const BG_COLOR = '#020617';     // Slate-950 style
    const TITLE_COLOR = '#e5e7eb';  // Light text
    const SUBTITLE_COLOR = '#9ca3af'; // Muted text

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Draw Title
    ctx.fillStyle = TITLE_COLOR;
    ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';

    const titleX = PADDING;
    let textY = PADDING;
    const titleText = scalexModalTitle || 'Chart';
    ctx.fillText(titleText, titleX, textY);

    // Draw Subtitle (if any)
    if (hasSubtitle) {
        ctx.fillStyle = SUBTITLE_COLOR;
        ctx.font = '400 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        textY += TITLE_LINE + TITLE_GAP;
        ctx.fillText(scalexModalSubtitle, titleX, textY);
    }

    // Draw chart below the text block
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
            console.error('jsPDF not available');
            return;
        }

        const pdfWidth = exportWidth * PX_TO_MM;
        const pdfHeight = exportHeight * PX_TO_MM;
        const orientation = pdfWidth > pdfHeight ? 'l' : 'p';

        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        pdf.addImage(finalDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('scalex-chart.pdf');
    }
}

/* ============================================================================
 * DETAIL CHART AREA: utilities to create / clear cards
 * ========================================================================== */

/**
 * Destroy existing detail charts and clear #detail-charts container.
 */
function clearDetailCharts() {
    const container = document.getElementById('detail-charts');

    scalexDetailCharts.forEach(ch => {
        try {
            ch.destroy();
        } catch (e) {
            console.warn('Chart destroy failed', e);
        }
    });
    scalexDetailCharts.length = 0;

    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Create a detail card inside #detail-charts with:
 *  - Header (title)
 *  - Optional subtitle
 *  - Optional <canvas> inside a wrapper
 *
 * @param {string} title
 * @param {string|null} subtitle
 * @param {boolean} withCanvas
 * @returns {{ card: HTMLElement|null, canvas: HTMLCanvasElement|null }}
 */
function createDetailCard(title, subtitle, withCanvas = true) {
    const container = document.getElementById('detail-charts');
    if (!container) return { card: null, canvas: null };

    const card = document.createElement('div');
    card.className = 'detail-card';

    const header = document.createElement('div');
    header.className = 'detail-card-header';

    const titleEl = document.createElement('h4');
    titleEl.className = 'detail-card-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);

    if (subtitle) {
        const subEl = document.createElement('p');
        subEl.className = 'detail-card-subtitle';
        subEl.textContent = subtitle;

        card.appendChild(header);
        card.appendChild(subEl);
    } else {
        card.appendChild(header);
    }

    let canvas = null;

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

/* ============================================================================
 * KPI CARD DATA + RENDERING (sample series for demo)
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * KPI sample data setup (Revenue / Spend / ROAS / ROI)
 * ------------------------------------------------------------------------ */

const DAYS_IN_MONTH = 30;
const dayIndexes = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i); // 0..29

// Daily revenue (₹) for Sep (previous) and Oct (current)
const revenueCurrent = dayIndexes.map(d => 110000 + d * 1500);  // Oct: gently rising
const revenuePrevious = dayIndexes.map(d => 100000 + d * 1300); // Sep: slightly lower

// Daily ad spend (₹) for Sep (previous) and Oct (current)
const spendCurrent = dayIndexes.map(d => 35000 + d * 400);  // Oct spend slightly higher
const spendPrevious = dayIndexes.map(d => 32000 + d * 350); // Sep slightly lower

// Derived daily ROAS (ratio) and ROI (%) so KPIs are mathematically consistent
const roasCurrent = revenueCurrent.map((rev, idx) => rev / spendCurrent[idx]);
const roasPrevious = revenuePrevious.map((rev, idx) => rev / spendPrevious[idx]);

const roiCurrent = revenueCurrent.map(
    (rev, idx) => ((rev - spendCurrent[idx]) / spendCurrent[idx]) * 100
);
const roiPrevious = revenuePrevious.map(
    (rev, idx) => ((rev - spendPrevious[idx]) / spendPrevious[idx]) * 100
);

/**
 * Structure used by renderKpiCards()
 */
const sampleData = {
    revenue: {
        current: revenueCurrent,   // October
        previous: revenuePrevious  // September
    },
    spend: {
        current: spendCurrent,
        previous: spendPrevious
    },
    roas: {
        current: roasCurrent,
        previous: roasPrevious
    },
    roi: {
        current: roiCurrent,
        previous: roiPrevious
    }
};

/* ---------------------------------------------------------------------------
 * KPI helper functions: aggregation + formatting + sparkline factory
 * ------------------------------------------------------------------------ */

function sumToDate(arr, day) {
    const end = Math.min(day, arr.length);
    return arr.slice(0, end).reduce((a, b) => a + b, 0);
}

function avgToDate(arr, day) {
    const end = Math.min(day, arr.length);
    if (end === 0) return 0;
    return arr.slice(0, end).reduce((a, b) => a + b, 0) / end;
}

function formatNumber(v) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatOneDecimal(v) {
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * Apply KPI % change formatting + CSS classes to an element.
 * invert = true → "up is bad" (e.g. Spend)
 */
function applyChange(el, pct, invert = false) {
    const isUp = pct >= 0;
    const good = invert ? !isUp : isUp;

    const arrow = isUp ? '▲' : '▼';
    const cls = good ? 'up' : 'down';
    const sign = pct >= 0 ? '+' : '';

    el.classList.remove('up', 'down');
    el.classList.add(cls);
    el.textContent = `${arrow} ${sign}${pct.toFixed(1)}%`;
}

/**
 * Sparkline chart creator for KPI cards.
 */
function createSparkline(ctx, values, strokeColor, fillColor) {
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

    return chart;
}

/* ---------------------------------------------------------------------------
 * Render KPI cards (called once on DOMContentLoaded)
 * ------------------------------------------------------------------------ */

function renderKpiCards() {
    const today = new Date().getDate(); // Live cutoff

    // ------- Revenue -------
    {
        const { current, previous } = sampleData.revenue;
        const currVal = sumToDate(current, today);
        const prevVal = sumToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('rev-current').textContent = '₹ ' + formatNumber(currVal);
        document.getElementById('rev-prev').textContent = 'Prev: ₹ ' + formatNumber(prevVal);

        const changeEl = document.getElementById('rev-change');
        applyChange(changeEl, pct);

        const ctx = document.getElementById('rev-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRevenue, SCALEX_COLORS.kpiRevenueFill);
    }

    // ------- Spend -------
    {
        const { current, previous } = sampleData.spend;
        const currVal = sumToDate(current, today);
        const prevVal = sumToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('spend-current').textContent = '₹ ' + formatNumber(currVal);
        document.getElementById('spend-prev').textContent = 'Prev: ₹ ' + formatNumber(prevVal);

        const changeEl = document.getElementById('spend-change');
        // For spend, higher = "up is bad"
        applyChange(changeEl, pct, true);

        const ctx = document.getElementById('spend-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiSpend, SCALEX_COLORS.kpiSpendFill);
    }

    // ------- ROAS -------
    {
        const { current, previous } = sampleData.roas;
        const currVal = avgToDate(current, today);
        const prevVal = avgToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('roas-current').textContent = formatOneDecimal(currVal) + 'x';
        document.getElementById('roas-prev').textContent = 'Prev: ' + formatOneDecimal(prevVal) + 'x';

        const changeEl = document.getElementById('roas-change');
        applyChange(changeEl, pct);

        const ctx = document.getElementById('roas-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRoas, SCALEX_COLORS.kpiRoasFill);
    }

    // ------- ROI -------
    {
        const { current, previous } = sampleData.roi;
        const currVal = avgToDate(current, today);
        const prevVal = avgToDate(previous, today);
        const diff = currVal - prevVal;
        const pct = prevVal ? (diff / prevVal) * 100 : 0;

        document.getElementById('roi-current').textContent = formatOneDecimal(currVal) + '%';
        document.getElementById('roi-prev').textContent = 'Prev: ' + formatOneDecimal(prevVal) + '%';

        const changeEl = document.getElementById('roi-change');
        applyChange(changeEl, pct);

        const ctx = document.getElementById('roi-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), SCALEX_COLORS.kpiRoi, SCALEX_COLORS.kpiRoiFill);
    }
}

/* ============================================================================
 * PERFORMANCE OVERVIEW: sample data for detail charts
 * ========================================================================== */

// Funnel: Spend → Revenue → ROI → ROAS for Meta, Google & LinkedIn
const funnelData = {
    meta: [
        { stage: 'Spend',   value: 450000 },   // ₹4.5L
        { stage: 'Revenue', value: 1400000 },  // ₹14L
        { stage: 'ROAS',    value: 3.11 },     // ~3.11x
        { stage: 'ROI',     value: 2.11 }      // ~211%
    ],
    google: [
        { stage: 'Spend',   value: 600000 },   // ₹6L
        { stage: 'Revenue', value: 2200000 },  // ₹22L
        { stage: 'ROAS',    value: 3.67 },     // ~3.67x
        { stage: 'ROI',     value: 2.67 }      // ~267%
    ],
    linkedin: [
        { stage: 'Spend',   value: 300000 },   // ₹3L
        { stage: 'Revenue', value: 900000 },   // ₹9L
        { stage: 'ROAS',    value: 3.00 },     // 3.0x
        { stage: 'ROI',     value: 2.00 }      // 200%
    ]
};

// CAC trends: blended vs paid + split by Meta vs Google (May → Oct, Oct latest)
const cacTrendData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    blendedCAC: [1140, 1120, 1100, 1080, 1050, 1020],
    paidCAC:    [1600, 1580, 1550, 1520, 1480, 1450],
    metaCAC:    [1500, 1480, 1460, 1440, 1420, 1400],
    googleCAC:  [1750, 1720, 1690, 1660, 1620, 1580],
    linkedinCAC:[3800, 4100, 4450, 4600, 4800, 5000]
};

// Paid campaign ROI by lead stage (Meta vs Google vs LinkedIn)
const paidCampaignRoiByStage = {
    labels: ['Lead', 'MQL', 'SQL', 'Converted'],
    metaRoiPercent:      [80, 150, 190, 210],
    googleRoiPercent:    [70, 140, 180, 265],
    linkedinRoiPercent:  [55, 72, 84, 110]
};

// Pipeline value attributed to marketing (≈ 3x of monthly revenue)
const pipelineValueData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    pipelineValue: [
        6600000,   // May  (₹66L)
        7200000,   // Jun  (₹72L)
        7950000,   // Jul  (₹79.5L)
        8700000,   // Aug  (₹87L)
        9600000,   // Sep  (₹96L)
        10800000   // Oct  (₹108L)
    ]
};

// LTV:CAC ratio card – consistent with growth story
const ltvCacSummary = {
    ltv: 27000,     // Avg lifetime value per customer
    cac: 8000,      // Avg customer acquisition cost
    ratio: 3.4,     // 3.4 : 1 – healthy
    status: 'healthy'
};

// LTV cohorts – each quarter’s cohort gets better
const ltvCohortData = {
    cohorts: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
    avgLtv:  [20000, 23000, 26000, 10000]
};

// Attribution accuracy vs baseline (May → Oct)
const attributionAccuracyData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    baseline: [70, 70, 70, 70, 70, 70],
    actual:   [72, 75, 78, 80, 83, 86]
};

// Top channels by ROAS
const topChannelsByRoas = {
    labels: ['Affiliate', 'Google Search', 'Meta Ads', 'Google Display', 'LinkedIn'],
    roas:   [4.2, 3.7, 3.1, 2.6, 2.4]
};

// New vs Repeat Revenue Mix (May → Oct)
const revenueMixData = {
    months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    newPct: [42, 45, 47, 50, 52, 55],
    repeatPct: [58, 55, 53, 50, 48, 45],
    revenueNew:    [4.2, 4.5, 4.8, 5.2, 5.4, 5.8],  // in ₹ Lakhs
    revenueRepeat: [5.8, 5.5, 5.4, 5.2, 5.0, 4.8]   // in ₹ Lakhs
};

/* ---------------------------------------------------------------------------
 * Render Performance Overview detail section (10 cards)
 * ------------------------------------------------------------------------ */

function renderPerformanceOverviewDetails() {
    clearDetailCharts();
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }

    const metaColor = SCALEX_COLORS.meta;
    const googleColor = SCALEX_COLORS.google;
    const linkedinColor = SCALEX_COLORS.linkedin;

    // 1) Funnel – Spend → Revenue → ROI → ROAS (Meta vs Google vs LinkedIn)
    (function () {
        const meta = funnelData.meta;
        const google = funnelData.google;
        const linkedin = funnelData.linkedin;
        const stages = ['Spend', 'Revenue', 'ROI', 'ROAS'];

        // Build lookups
        const metaByStage = meta.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});
        const googleByStage = google.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});
        const linkedinByStage = linkedin.reduce((acc, d) => { acc[d.stage] = d.value; return acc; }, {});

        // Money axis: Spend + Revenue only
        const metaMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? metaByStage[stage] ?? null : null
        );
        const googleMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? googleByStage[stage] ?? null : null
        );
        const linkedinMoney = stages.map(stage =>
            (stage === 'Spend' || stage === 'Revenue') ? linkedinByStage[stage] ?? null : null
        );

        // Percent axis: ROI + ROAS (store as percent)
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
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Google',
                        data: googleMoney,
                        yAxisID: 'y',
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'LinkedIn',
                        data: linkedinMoney,
                        yAxisID: 'y',
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
                    },

                    // Ratios (%) – right axis, hidden from legend
                    {
                        label: 'Meta (ratio)',
                        data: metaRatio,
                        yAxisID: 'y1',
                        backgroundColor: metaColor,
                        borderColor: metaColor,
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'Google (ratio)',
                        data: googleRatio,
                        yAxisID: 'y1',
                        backgroundColor: googleColor,
                        borderColor: googleColor,
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
                    },
                    {
                        label: 'LinkedIn (ratio)',
                        data: linkedinRatio,
                        yAxisID: 'y1',
                        backgroundColor: linkedinColor,
                        borderColor: linkedinColor,
                        borderWidth: 1,
                        bar: 0.9,
                        categoryPercentage: 0.9
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
                        // Sync ratio datasets with legend visibility
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
    })();

    // 2) Blended CAC vs Paid CAC – trend lines
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
    })();

    // 3) Meta · Google · LinkedIn – CAC Trend Lines
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
    })();

    // 4) Paid Campaign ROI (%) by Stage – Meta · Google · LinkedIn
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
    })();

    // 5) Pipeline value attributed to marketing (horizontal bar)
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
    })();

    // 6) LTV:CAC ratio card (pure DOM, no chart)
    (function () {
        const { ltv, cac, ratio, status } = ltvCacSummary;
        const { card } = createDetailCard(
            'LTV : CAC Ratio',
            null,
            false
        );
        if (!card) return;

        const body = document.createElement('div');
        body.className = 'detail-ltv-body';

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

    // 7) LTV cohorts chart
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
    })();

    // 8) Attribution Accuracy Rate (vs baseline)
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
    })();

    // 9) Top channels by ROAS
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
    })();

    // 10) New vs Repeat Revenue Mix – 100% stacked bar
    (function () {
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
                                return `${months[i]} 2025`;
                            },
                            label: (ctx) => {
                                const idx = ctx.dataIndex;
                                if (ctx.dataset.label.includes('New')) {
                                    return `New: ${newPct[idx]}% (₹ ${revenueNew[idx].toFixed(1)}L)`;
                                }
                                if (ctx.dataset.label.includes('Repeat')) {
                                    return `Repeat: ${repeatPct[idx]}% (₹ ${revenueRepeat[idx].toFixed(1)}L)`;
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

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);
    })();
}

/* ============================================================================
 * CHANNEL & CAMPAIGN ANALYTICS: sample data for detail charts
 * ========================================================================== */

const channelEfficiencyData = {
    channels: ['Meta Ads', 'Google Ads', 'LinkedIn'],
    cpl: [2400, 1800, 2600],
    cac: [3200, 4050, 3600],
    roas: [3.1, 3.7, 2.8]
};

const campaignRoiBubbleData = [
    {
        name: 'Meta – Lead Gen',
        channel: 'Meta',
        roi: 220,
        spendLakh: 3.2,
        revenueLakh: 10.1,
        incrRoas: 28
    },
    {
        name: 'Google – Search Brand',
        channel: 'Google',
        roi: 260,
        spendLakh: 4.5,
        revenueLakh: 16.3,
        incrRoas: 35
    },
    {
        name: 'Google – Performance Max',
        channel: 'Google',
        roi: 210,
        spendLakh: 2.9,
        revenueLakh: 9.0,
        incrRoas: 18
    },
    {
        name: 'LinkedIn – ABM',
        channel: 'LinkedIn',
        roi: 160,
        spendLakh: 1.8,
        revenueLakh: 4.7,
        incrRoas: 12
    }
];

const creativePerformanceSummary = {
    ctr: {
        latest: 3.4,
        delta: 0.6,
        direction: 'up',
        unit: '%'
    },
    cpc: {
        latest: 22,
        delta: -12,
        direction: 'down',
        unit: '₹'
    },
    engagement: {
        latest: 8.5,
        delta: 1.1,
        direction: 'up',
        unit: '%'
    }
};

const audienceRoasData = {
    labels: ['New Visitors', 'Repeat Buyers', 'CRM Lookalike', 'Remarketing'],
    roas:   [2.4, 3.3, 3.1, 2.8]
};

const leadQualityData = {
    channels: ['Google Ads', 'Meta Ads', 'LinkedIn'],
    scores:  [82, 74, 66]
};

const spendEfficiencyData = {
    channels:    ['Google Ads', 'Meta Ads', 'YouTube', 'LinkedIn'],
    spendShare:  [38, 24, 22, 16],
    revenueShare:[43, 19, 18, 20]
};

const touchPointSplitData = {
    channels: ['Meta Ads', 'Google Ads', 'Direct'],
    first:    [45, 30, 25],
    mid:      [35, 40, 10],
    last:     [20, 30, 65]
};

const channelPerformanceTableData = [
    {
        channel: 'Meta Ads',
        spend: 325000,
        revenue: 1010000,
        cpl: 2400,
        cac: 3200,
        roas: 3.1,
        roi: 220,
        leadQuality: 74
    },
    {
        channel: 'Google Ads',
        spend: 270000,
        revenue: 990000,
        cpl: 1900,
        cac: 4050,
        roas: 3.7,
        roi: 260,
        leadQuality: 82
    },
    {
        channel: 'LinkedIn',
        spend: 160000,
        revenue: 520000,
        cpl: 2600,
        cac: 3600,
        roas: 2.8,
        roi: 160,
        leadQuality: 66
    }
];

/* ---------------------------------------------------------------------------
 * Render Channel & Campaign Analytics detail section
 * ------------------------------------------------------------------------ */

function renderChannelCampaignDetails() {
    clearDetailCharts();
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }

    const metaColor = SCALEX_COLORS.meta;
    const googleColor = SCALEX_COLORS.google;
    const linkedinColor = SCALEX_COLORS.linkedin;

    // 1) Channel-wise CPL · CAC · ROAS
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
    })();

    // 2) Campaign-Level ROI / Incremental ROAS – bubble chart
    (function () {
        const { canvas } = createDetailCard(
            'Campaign ROI & Incremental ROAS',
            'Bubble size = revenue; X = ROI%, Y = spend'
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
    })();

    // 3) Touch-Point Revenue Split (First / Mid / Last)
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
    })();

    // 4) Audience Segment ROAS
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
    })();

    // 5) Lead Quality Score by Channel
    (function () {
        const { channels, scores } = leadQualityData;
        const { canvas } = createDetailCard(
            'Lead Quality Score by Channel',
            '0–100 score based on CRM pipeline outcomes'
        );
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const colors = scores.map(s => {
            if (s >= 80) return SCALEX_COLORS.good;
            if (s >= 70) return SCALEX_COLORS.warning;
            return SCALEX_COLORS.bad;
        });

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    // Dummy dataset just to show "Warning" in legend
                    {
                        label: 'Warning (70–79)',
                        backgroundColor: SCALEX_COLORS.warning,
                        borderColor: SCALEX_COLORS.warning,
                        barThickness: 1
                    },
                    // Actual scores
                    {
                        label: 'Good (80–100)',
                        data: scores,
                        backgroundColor: colors,
                        borderColor: colors,
                        borderWidth: 1,
                        barThickness: 30
                    },
                    // Dummy dataset just to show "Bad" in legend
                    {
                        label: 'Bad (0–69)',
                        backgroundColor: SCALEX_COLORS.bad,
                        borderColor: SCALEX_COLORS.bad,
                        barThickness: 1
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
                            label: (ctx) => `${ctx.raw.toFixed(0)}/100`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        scalexDetailCharts.push(chart);
        scalexChartRegistry.set(ctx.canvas, chart);
    })();

    // 6) Spend Efficiency Index: Spend% vs Revenue%
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
    })();

    // 7) Creative CTR / CPC / Engagement – metric tiles (no chart)
    (function () {
        const { card } = createDetailCard(
            'Creative Performance',
            'CTR · CPC · Engagement (last 30 days)',
            false
        );
        if (!card) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'metric-tiles-wrapper';

        function makeTile(title, metric) {
            const tile = document.createElement('div');
            tile.className = 'metric-tile';

            const titleEl = document.createElement('p');
            titleEl.className = 'metric-tile-title';
            titleEl.textContent = title;

            const valueEl = document.createElement('p');
            valueEl.className = 'metric-tile-value';
            valueEl.textContent = metric.unit === '₹'
                ? `₹ ${metric.latest.toLocaleString()}`
                : `${metric.latest}${metric.unit}`;

            const deltaEl = document.createElement('p');
            deltaEl.className = 'metric-tile-delta';
            const arrow = metric.direction === 'up' ? '▲' : '▼';
            const colorClass = metric.direction === 'up'
                ? 'metric-tile-delta-up'
                : 'metric-tile-delta-down';
            deltaEl.classList.add(colorClass);

            const absDelta = Math.abs(metric.delta);
            if (metric.unit === '%') {
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

    // 8) Channel Performance Snapshot – table card with CSV download
    (function () {
        const { card } = createDetailCard(
            'Channel Performance Snapshot',
            'Spend, revenue, and efficiency metrics by channel',
            false
        );
        if (!card) return;

        // Add CSV download button in card header
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

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'channel-performance-table-wrapper';

        const table = document.createElement('table');
        table.className = 'channel-performance-table';

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
 * CSV export for "Channel Performance Snapshot" table
 * ------------------------------------------------------------------------ */

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

    // Header row
    csvLines.push(headers.join(','));

    // Data rows with basic CSV escaping
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

/* ============================================================================
 * DOM-READY WIRES: icons, export menu, modal buttons, sidebar routing, KPIs
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    // 1) Lucide icons (safe-guarded)
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 2) Export dropdown toggle (header export button)
    const exportToggle = document.getElementById('export-toggle');
    const exportMenu = document.getElementById('export-menu');

    document.addEventListener('click', function (e) {
        if (!exportToggle || !exportMenu) return;

        if (exportToggle.contains(e.target)) {
            exportMenu.classList.toggle('hidden');
        } else if (!exportMenu.contains(e.target)) {
            exportMenu.classList.add('hidden');
        }
    });

    // 3) Fullscreen chart modal button bindings
    const modalClose = document.getElementById('chart-modal-close');
    const modalPng = document.getElementById('chart-modal-download-png');
    const modalPdf = document.getElementById('chart-modal-download-pdf');
    const modal = document.getElementById('chart-modal');

    if (modalClose) {
        modalClose.addEventListener('click', closeChartModal);
    }
    if (modalPng) {
        modalPng.addEventListener('click', () => downloadModalChart('png'));
    }
    if (modalPdf) {
        modalPdf.addEventListener('click', () => downloadModalChart('pdf'));
    }

    // Close modal when clicking dark background (but not inner card)
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeChartModal();
            }
        });
    }

    // 4) Export option clicks (PNG/PDF from header menu)
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', async function () {
            const format = this.getAttribute('data-format');
            if (exportMenu) exportMenu.classList.add('hidden');
            await exportDashboard(format);
        });
    });

    // 5) Sidebar nav → heading + analysis view routing
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const heading = document.getElementById('main-heading');

    function clearActive() {
        sidebarLinks.forEach(link => link.classList.remove('active'));
    }

    function getAnalysisKey(label) {
        const text = label.toLowerCase();
        if (text.includes('performance overview')) return 'performance-overview';
        if (text.includes('channel') || text.includes('campaign')) return 'channel-campaign-analytics';
        if (text.includes('attribution') || text.includes('signal')) return 'attribution-signal-health';
        if (text.includes('funnel') || text.includes('journey')) return 'funnel-lead-journey';
        return 'performance-overview';
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function () {
            const label = this.textContent.trim();
            const key = getAnalysisKey(label);

            clearActive();
            this.classList.add('active');
            if (heading) heading.textContent = label;

            if (typeof window.renderFiltersForAnalysis === 'function') {
                window.renderFiltersForAnalysis(key);
            }
            if (typeof window.handleAnalysisViewChange === 'function') {
                window.handleAnalysisViewChange(key);
            }
        });
    });

    // 6) Default analysis view handler
    if (typeof window.handleAnalysisViewChange !== 'function') {
        window.handleAnalysisViewChange = function (key) {
            const smartAlertsSection = document.getElementById('smart-alerts');
            const kpiSectionEl = document.getElementById('kpi-cards');

            // Show Smart Alerts only on Performance Overview
            if (smartAlertsSection) {
                if (key === 'performance-overview') {
                    smartAlertsSection.classList.remove('hidden');
                } else {
                    smartAlertsSection.classList.add('hidden');
                }
            }

            // Show KPI cards only on Performance Overview
            if (kpiSectionEl) {
                if (key === 'performance-overview') {
                    kpiSectionEl.style.display = '';
                } else {
                    kpiSectionEl.style.display = 'none';
                }
            }

            // Detail section routing
            if (key === 'performance-overview') {
                renderPerformanceOverviewDetails();
            } else if (key === 'channel-campaign-analytics') {
                renderChannelCampaignDetails();
            } else {
                // Other tabs: clear detail area and show placeholder
                clearDetailCharts();
                const container = document.getElementById('detail-charts');
                if (container) {
                    const p = document.createElement('p');
                    p.className = 'text-gray-300 text-sm';
                    p.textContent = 'Detailed charts for this view are coming soon.';
                    container.appendChild(p);
                }
            }
        };
    }

    // 7) Default active sidebar link + heading
    if (sidebarLinks.length > 0 && heading) {
        sidebarLinks[0].classList.add('active');
        heading.textContent = sidebarLinks[0].textContent.trim();
    }

    // 8) Optional user data load (if defined elsewhere)
    if (typeof window.fetchAndDisplayUserData === 'function') {
        window.fetchAndDisplayUserData();
    }

    // 9) Initial view render for Performance Overview
    if (typeof window.handleAnalysisViewChange === 'function') {
        window.handleAnalysisViewChange('performance-overview');
    }

    // 10) Initial KPI card render (sparklines + values)
    renderKpiCards();
});



/* ------------------------------------------------------------------
 * Client Profile / Ads Connection Modal Logic
 * ------------------------------------------------------------------ */

(function () {
    const clientIdDisplay = document.getElementById('client-id-display');
    const modalBackdrop = document.getElementById('client-modal-backdrop');
    const closeBtn = document.getElementById('client-modal-close');
    const clientIdValueEl = document.getElementById('client-modal-client-id');
    const clientEmailEl = document.getElementById('client-modal-client-email');

    const googleBtn = document.getElementById('google-ads-connect');
    const metaBtn = document.getElementById('meta-ads-connect');
    const googleLink = document.getElementById('google-ads-link');
    const metaLink = document.getElementById('meta-ads-link');

    if (!clientIdDisplay || !modalBackdrop) {
        return; // safe guard if markup not present
    }

    function openClientModal() {
        // Read client id from header
        const rawText = clientIdDisplay.textContent || '';
        const cleanedClientId = rawText.trim();

        // Show client id inside modal
        if (clientIdValueEl) {
            clientIdValueEl.textContent = cleanedClientId || '--';
        }

        // TODO: Replace this with actual email from backend when available
        if (clientEmailEl && !clientEmailEl.textContent.trim()) {
            clientEmailEl.textContent = 'client@example.com';
        }

        // Build dynamic URLs for Google / Meta links
        const clientIdParam = encodeURIComponent(cleanedClientId || '');
        
        if (googleLink) {
            const baseUrl = googleLink.dataset.baseUrl;
            if (baseUrl && clientIdParam) {
                googleLink.href = `${baseUrl}?client_id=${clientIdParam}`;
            }
        }

        if (metaLink) {
            const baseUrl = metaLink.dataset.baseUrl;
            if (baseUrl && clientIdParam) {
                metaLink.href = `${baseUrl}?client_id=${clientIdParam}`;
            }
        }

        // Open modal
        modalBackdrop.classList.remove('hidden');
        document.body.classList.add('client-modal-open');
    }

    function closeClientModal() {
        modalBackdrop.classList.add('hidden');
        document.body.classList.remove('client-modal-open');
    }

    // Open on client id click
    clientIdDisplay.addEventListener('click', openClientModal);

    // Close on ✕
    if (closeBtn) {
        closeBtn.addEventListener('click', closeClientModal);
    }

    // Close when clicking outside the panel
    modalBackdrop.addEventListener('click', (evt) => {
        if (evt.target === modalBackdrop) {
            closeClientModal();
        }
    });

    // Placeholder click handlers for connect buttons
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            console.log('TODO: trigger Google Ads OAuth popup for this client');
            // Later: redirect to /oauth/google?client_id=...
        });
    }

    if (metaBtn) {
        metaBtn.addEventListener('click', () => {
            console.log('TODO: trigger Meta Ads OAuth popup for this client');
            // Later: redirect to /oauth/meta?client_id=...
        });
    }
})();
