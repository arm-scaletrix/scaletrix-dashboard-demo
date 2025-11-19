/* Dashboard Layout Logic
 * - Sidebar tab active state
 * - Sync heading with selected tab
 * - Toggle filter section (for later use)
 * - Safe hooks into future functions (no errors if missing)
 */

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

// ---------- Filter Section Toggle ----------
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

    if (window.lucide) window.lucide.createIcons();
};


// ---------- EXPORT: capture + download (main-content only, with margins) ----------
async function exportDashboard(format) {
    try {
        if (!window.htmlToImage) {
            console.error('html-to-image not loaded');
            return;
        }

        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        const target = document.getElementById('main-content');  // only right-side content

        if (!target) {
            console.error('No #main-content found for export.');
            return;
        }

        // hide the filter section before capture
        const filterSection = document.getElementById('filter-section');
        const prevDisplay = filterSection ? filterSection.style.display : null;
        if (filterSection) filterSection.style.display = 'none';

        // make sure everything visible
        window.scrollTo(0, 0);

        // 1) capture main-content as PNG (hi-res)
        const rawDataUrl = await htmlToImage.toPng(target, {
            pixelRatio: 2,
            backgroundColor: '#164348'
        });

        // restore visibility immediately after capture
        if (filterSection) filterSection.style.display = prevDisplay ?? '';

        // 2) wrap it in a canvas with margin so it doesn't touch edges
        const MARGIN_PX = 40; // margin inside the exported image
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

        // ---------- PNG DOWNLOAD ----------
        if (format === 'png') {
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = 'scalex-dashboard.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            return;
        }

        // ---------- PDF DOWNLOAD ----------
        if (format === 'pdf') {
            if (!jsPDF) {
                console.error('jsPDF not available');
                return;
            }

            // convert canvas size (px) to mm for a snug, no-extra-white page
            const PX_TO_MM = 25.4 / 96; // assuming 96dpi; close enough for UI exports
            const pdfWidth = canvas.width * PX_TO_MM;
            const pdfHeight = canvas.height * PX_TO_MM;

            const orientation = pdfWidth > pdfHeight ? 'l' : 'p';

            // create PDF with page size matching the image+margin
            const pdf = new jsPDF({
                orientation,
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            // full-page image (already has visual margin baked in)
            pdf.addImage(finalDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

            pdf.save('scalex-dashboard.pdf');
        }
    } catch (err) {
        console.error('Export failed:', err);
    }
}



// ---------- DOM-READY WIRES (export + sidebar + icons) ----------
document.addEventListener('DOMContentLoaded', function () {
    // lucide icons (safe)
    if (window.lucide) window.lucide.createIcons();

    // --- Export dropdown toggle ---
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

	// --- Chart fullscreen modal buttons ---
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

    // Close when clicking dark background (but not inner card)
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeChartModal();
            }
        });
    }

    // --- Export option clicks ---
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', async function () {
            const format = this.getAttribute('data-format');
            if (exportMenu) exportMenu.classList.add('hidden');
            await exportDashboard(format);
        });
    });

    // --- Sidebar logic (unchanged) ---
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

    // Default analysis view handler: we can override per analysis key later.
    if (typeof window.handleAnalysisViewChange !== 'function') {
        window.handleAnalysisViewChange = function (key) {
            // For now, only Performance Overview has detailed charts
            if (key === 'performance-overview') {
                renderPerformanceOverviewDetails();
            } else {
                // Other tabs: clear detail area and show a placeholder
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

    if (sidebarLinks.length > 0 && heading) {
        sidebarLinks[0].classList.add('active');
        heading.textContent = sidebarLinks[0].textContent.trim();
    }

    if (typeof window.fetchAndDisplayUserData === 'function') {
        window.fetchAndDisplayUserData();
    }

	// Initial render for Performance Overview detail charts
    if (typeof window.handleAnalysisViewChange === 'function') {
        window.handleAnalysisViewChange('performance-overview');
    }

});


// --- KPI card testing with sample data ---
    // We treat KPIs as: current month = October, previous month = September.
    // Below we generate daily series so that:
    // - Oct revenue & spend are higher than Sep
    // - ROAS and ROI are slightly better in Oct
    // - Trends are consistent with the 6-month charts (CAC down, ROAS up)

    const DAYS_IN_MONTH = 30;
    const dayIndexes = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i); // 0..29

    // Daily revenue (₹) for Sep (previous) and Oct (current)
    const revenueCurrent = dayIndexes.map(d => 110000 + d * 1500);  // Oct: gently rising
    const revenuePrevious = dayIndexes.map(d => 100000 + d * 1300); // Sep: slightly lower

    // Daily ad spend (₹) for Sep (previous) and Oct (current)
    const spendCurrent = dayIndexes.map(d => 35000 + d * 400);  // Oct spend a bit higher
    const spendPrevious = dayIndexes.map(d => 32000 + d * 350); // Sep slightly lower

    // Derived daily ROAS (ratio) and ROI (%) so KPIs are mathematically consistent
    const roasCurrent = revenueCurrent.map((rev, idx) => rev / spendCurrent[idx]); // ~3.1–3.4x
    const roasPrevious = revenuePrevious.map((rev, idx) => rev / spendPrevious[idx]);

    const roiCurrent = revenueCurrent.map(
        (rev, idx) => ((rev - spendCurrent[idx]) / spendCurrent[idx]) * 100
    ); // ~210–240%
    const roiPrevious = revenuePrevious.map(
        (rev, idx) => ((rev - spendPrevious[idx]) / spendPrevious[idx]) * 100
    );

    // Attach into the structure used by renderKpiCards()
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

    function renderKpiCards() {
      const today = new Date().getDate(); // live cutoff

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
        createSparkline(ctx, current.slice(0, today), '#22c55e', 'rgba(34,197,94,0.12)');
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
        applyChange(changeEl, pct, true); // for spend, up might be "worse" depending on your logic
        // Here I'm treating higher spend as "up = red", adjust as you like.
        const ctx = document.getElementById('spend-chart').getContext('2d');
        createSparkline(ctx, current.slice(0, today), '#6366f1', 'rgba(99,102,241,0.16)');
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
        createSparkline(ctx, current.slice(0, today), '#fbbf24', 'rgba(251,191,36,0.16)');
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
        createSparkline(ctx, current.slice(0, today), '#ec4899', 'rgba(236,72,153,0.18)');
      }
    }

    function applyChange(el, pct, invert = false) {
      // invert=true -> up is bad (e.g., Spend)
      const isUp = pct >= 0;
      const good = invert ? !isUp : isUp;

      const arrow = isUp ? '▲' : '▼';
      const cls = good ? 'up' : 'down';
      const sign = pct >= 0 ? '+' : '';

      el.classList.remove('up', 'down');
      el.classList.add(cls);
      el.textContent = `${arrow} ${sign}${pct.toFixed(1)}%`;
    }

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

  const canvas = ctx.canvas;
  return chart;
}

    document.addEventListener('DOMContentLoaded', renderKpiCards);


// --- KPI card testing with sample data ---
// ========= Performance Overview – Detailed View (sample data + renderers) =========

// Keep references to Chart.js instances so we can destroy them when switching views
const scalexDetailCharts = [];


// Registry of all charts by canvas element (KPI + detail)
const scalexChartRegistry = new Map();

// Modal state
let scalexModalChart = null;
let scalexModalSourceCanvas = null;
let scalexModalTitle = '';
let scalexModalSubtitle = '';

// Open fullscreen modal for a given canvas
function openChartModalFromCanvas(sourceCanvas) {
    const modal = document.getElementById('chart-modal');
    const modalCanvas = document.getElementById('chart-modal-canvas');
    const titleEl = document.getElementById('chart-modal-title');
    const subtitleEl = document.getElementById('chart-modal-subtitle'); // NEW

    if (!modal || !modalCanvas) return;

    const srcChart = scalexChartRegistry.get(sourceCanvas);
    if (!srcChart) {
        console.warn('No chart registered for canvas', sourceCanvas);
        return;
    }

    // Destroy any previous modal chart
    if (scalexModalChart) {
        try { scalexModalChart.destroy(); } catch (e) { /* ignore */ }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = sourceCanvas;

    // ----- Title -----
    const title =
        sourceCanvas.dataset.chartTitle ||
        sourceCanvas.closest('.detail-card-title')?.textContent ||
        'Chart';

    // ----- Subtitle: read from the same card -----
    let subtitleText = '';
    const detailCard = sourceCanvas.closest('.detail-card');
    if (detailCard) {
        const subNode = detailCard.querySelector('.detail-card-subtitle');
        if (subNode) {
            subtitleText = subNode.textContent.trim();
        }
    }

    // Write into modal DOM
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitleText;

    // Keep in JS state for downloadModalChart()
    scalexModalTitle = title;
    scalexModalSubtitle = subtitleText;

    // Show modal
    modal.classList.remove('hidden');

    // Resize canvas to container (double resolution for sharpness)
    const parent = modalCanvas.parentElement;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 500;
    modalCanvas.width = width * 2;
    modalCanvas.height = height * 2;

    const baseConfig = srcChart.config;
    const ctx = modalCanvas.getContext('2d');

    // Recreate chart with same type/data/options (legend, tooltip, onClick all preserved)
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

function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) modal.classList.add('hidden');

    if (scalexModalChart) {
        try { scalexModalChart.destroy(); } catch (e) { /* ignore */ }
        scalexModalChart = null;
    }

    scalexModalSourceCanvas = null;
    scalexModalTitle = '';
    scalexModalSubtitle = '';
}

// Download current modal chart as PNG or PDF
function downloadModalChart(format) {
    if (!scalexModalChart) return;

    const chartCanvas = scalexModalChart.canvas;

    // --- Layout constants ---
    const PADDING = 40;                 // outer padding
    const TITLE_LINE = 26;              // px height for title line
    const SUBTITLE_LINE = 18;           // px height for subtitle line
    const TITLE_GAP = 8;                // gap between title & subtitle
    const BLOCK_GAP = 12;               // gap between subtitle block and chart

    const hasSubtitle = !!scalexModalSubtitle;

    // Height of the text block at top
    let textBlockHeight = TITLE_LINE;
    if (hasSubtitle) {
        textBlockHeight += TITLE_GAP + SUBTITLE_LINE;
    }

    // Final canvas size (chart size + padding + text block)
    const exportWidth = chartCanvas.width + PADDING * 2;
    const exportHeight = chartCanvas.height + PADDING * 2 + textBlockHeight + BLOCK_GAP;

    // --- Create offscreen canvas with dark background ---
    const outCanvas = document.createElement('canvas');
    outCanvas.width = exportWidth;
    outCanvas.height = exportHeight;

    const ctx = outCanvas.getContext('2d');

    // Set this to EXACTLY the same color as your fullscreen modal background
    // (example: Tailwind slate-950 style)
    const BG_COLOR = '#020617';
    const TITLE_COLOR = '#e5e7eb';    // light text
    const SUBTITLE_COLOR = '#9ca3af'; // muted text

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // --- Draw title ---
    ctx.fillStyle = TITLE_COLOR;
    ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';

    const titleX = PADDING;
    let textY = PADDING;

    const titleText = scalexModalTitle || 'Chart';
    ctx.fillText(titleText, titleX, textY);

    // --- Draw subtitle (if available) ---
    if (hasSubtitle) {
        ctx.fillStyle = SUBTITLE_COLOR;
        ctx.font = '400 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        textY += TITLE_LINE + TITLE_GAP;
        ctx.fillText(scalexModalSubtitle, titleX, textY);
    }

    // --- Draw chart below text block ---
    const chartY = PADDING + textBlockHeight + BLOCK_GAP;
    ctx.drawImage(chartCanvas, PADDING, chartY, chartCanvas.width, chartCanvas.height);

    const finalDataUrl = outCanvas.toDataURL('image/png');

    // ---------- PNG ----------
    if (format === 'png') {
        const link = document.createElement('a');
        link.href = finalDataUrl;
        link.download = 'scalex-chart.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
    }

    // ---------- PDF ----------
    if (format === 'pdf') {
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) {
            console.error('jsPDF not available');
            return;
        }

        // px → mm (assuming ~96dpi, same as earlier)
        const PX_TO_MM = 25.4 / 96;
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


// Utility to clear detail section & destroy old charts
function clearDetailCharts() {
    const container = document.getElementById('detail-charts');
    // destroy existing charts
    scalexDetailCharts.forEach(ch => {
        try { ch.destroy(); } catch (e) { console.warn('Chart destroy failed', e); }
    });
    scalexDetailCharts.length = 0;

    if (container) {
        container.innerHTML = '';
    }
}

// Utility to create a card inside #detail-charts with a header + optional subtitle + <canvas>
function createDetailCard(title, subtitle, withCanvas = true) {
    const container = document.getElementById('detail-charts');
    if (!container) return {};

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

        // Mark for zoom + store title for modal
        canvas.classList.add('chart-clickable');
        canvas.dataset.chartTitle = title;
        canvas.addEventListener('click', () => openChartModalFromCanvas(canvas));

        canvasWrapper.appendChild(canvas);
        card.appendChild(canvasWrapper);
    }

    container.appendChild(card);
    return { card, canvas };
}

/* ---------- Sample data for Performance Overview detail charts ---------- */

// Funnel: Spend → Revenue → ROI → ROAS for Meta & Google
const funnelData = {
    meta: [
        { stage: 'Spend',   value: 450000 },   // ₹4.5L
        { stage: 'Revenue', value: 1400000 }, // ₹14L
        { stage: 'ROAS',    value: 3.11 },    // 1.4M / 0.45M ≈ 3.11x
        { stage: 'ROI',     value: 2.11 }     // (Rev - Spend)/Spend ≈ 211%
    ],
    google: [
        { stage: 'Spend',   value: 600000 },   // ₹6L
        { stage: 'Revenue', value: 2200000 }, // ₹22L
        { stage: 'ROAS',    value: 3.67 },    // 2.2M / 0.6M ≈ 3.67x
        { stage: 'ROI',     value: 2.67 }     // ≈ 267%
    ]
};

// CAC trends: blended vs paid + split by Meta vs Google (May → Oct, Oct is latest)
const cacTrendData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    // Overall CAC (all channels blended) – moving downward
    blendedCAC: [1140, 1120, 1100, 1080, 1050, 1020],
    // Paid-only CAC (Meta + Google) – higher than blended but improving
    paidCAC:    [1600, 1580, 1550, 1520, 1480, 1450],
    // Channel-wise CAC
    metaCAC:    [1500, 1480, 1460, 1440, 1420, 1400],
    googleCAC:  [1750, 1720, 1690, 1660, 1620, 1580]
};

// Paid campaign ROI by lead stage (Meta vs Google)
// Final "Converted" stage roughly matches the October ROI in funnelData.
const paidCampaignRoiByStage = {
    labels: ['Lead', 'MQL', 'SQL', 'Converted'],
    metaRoiPercent:   [80, 150, 190, 210], // % ROI per stage for Meta
    googleRoiPercent: [70, 140, 180, 265]  // Google stronger at final stage
};

// Pipeline value attributed to marketing (≈ 3x of monthly revenue)
const pipelineValueData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    pipelineValue: [
        6600000,  // May  (₹66L)
        7200000,  // Jun  (₹72L)
        7950000,  // Jul  (₹79.5L)
        8700000,  // Aug  (₹87L)
        9600000,  // Sep  (₹96L)
        10800000  // Oct  (₹108L)
    ]
};

// LTV:CAC summary card – consistent with overall growth story
const ltvCacSummary = {
    ltv: 27000,   // Avg lifetime value per customer (₹27k)
    cac: 8000,    // Avg CAC (₹8k)
    ratio: 3.4,   // 3.4 : 1 – healthy
    status: 'healthy' // badge styling already handled in CSS
};

// LTV cohorts – each quarter's cohort gets better
const ltvCohortData = {
    cohorts: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
    avgLtv:  [20000, 23000, 26000, 10000]
};

// Attribution accuracy vs baseline (May → Oct)
const attributionAccuracyData = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    baseline: [70, 70, 70, 70, 70, 70],  // static old model
    actual:   [72, 75, 78, 80, 83, 86]   // ScaleX model getting better
};

// Top channels by ROAS – consistent with funnel where Google slightly beats Meta
const topChannelsByRoas = {
    labels: ['Affiliate', 'Google Search', 'Meta Ads', 'Google Display', 'LinkedIn'],
    roas:   [4.2, 3.7, 3.1, 2.6, 2.4] // x multiplier
};

/* ---------- Render Performance Overview detail section ---------- */

function renderPerformanceOverviewDetails() {
    clearDetailCharts();
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available');
        return;
    }

	const metaColor = '#ffce56';   // Light Yellow
	const googleColor = '#cc65fe'; // Light Purple (French Lilac)

	// const metaColor = '#ff6384';   // Light Red
	// const googleColor = '#9bd0f5'; // Light Blue

    // 1) Funnel – Spend → Revenue → ROI → ROAS (Meta vs Google)
	(function () {
	    const meta = funnelData.meta;
	    const google = funnelData.google;
	
	    const stages = ['Spend', 'Revenue', 'ROI', 'ROAS'];
	
	    // Build lookup by stage
	    const metaByStage = meta.reduce((acc, d) => {
	        acc[d.stage] = d.value;
	        return acc;
	    }, {});
	    const googleByStage = google.reduce((acc, d) => {
	        acc[d.stage] = d.value;
	        return acc;
	    }, {});
	
	    // Money axis: only Spend + Revenue
	    const metaMoney = stages.map(stage =>
	        (stage === 'Spend' || stage === 'Revenue') ? metaByStage[stage] ?? null : null
	    );
	    const googleMoney = stages.map(stage =>
	        (stage === 'Spend' || stage === 'Revenue') ? googleByStage[stage] ?? null : null
	    );
	
	    // Percent axis: ROI + ROAS (store as percent, not ratio)
	    const metaRatio = stages.map(stage => {
	        if (stage === 'ROI' || stage === 'ROAS') {
	            const v = metaByStage[stage];
	            return v != null ? v * 100 : null; // 2.7 -> 270
	        }
	        return null;
	    });
	
	    const googleRatio = stages.map(stage => {
	        if (stage === 'ROI' || stage === 'ROAS') {
	            const v = googleByStage[stage];
	            return v != null ? v * 100 : null; // 3.7 -> 370
	        }
	        return null;
	    });
	
	    const { canvas } = createDetailCard(
	        'Spend → Revenue → ROI → ROAS',
	        'Comparison of Meta vs Google funnel performance'
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
						bar: .9,
						categoryPercentage: 0.9
	                },
	                {
	                    label: 'Google',
	                    data: googleMoney,
	                    yAxisID: 'y',
	                    backgroundColor: googleColor,
	                    borderColor: googleColor,
	                    borderWidth: 1,
						bar: .9,
						categoryPercentage: 0.9
	                },
	                // Ratios (%) – right axis (hidden from legend)
	                {
	                    label: 'Meta (ratio)',
	                    data: metaRatio,
	                    yAxisID: 'y1',
	                    backgroundColor: metaColor,
	                    borderColor: metaColor,
	                    borderWidth: 1,
						bar: .9,
						categoryPercentage: 0.9
	                },
	                {
	                    label: 'Google (ratio)',
	                    data: googleRatio,
	                    yAxisID: 'y1',
	                    backgroundColor: googleColor,
	                    borderColor: googleColor,
	                    borderWidth: 1,
						bar: .9,
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
	                    labels: {
	                        // Hide the "(ratio)" datasets from the legend
	                        filter: function (item) {
	                            return !item.text.includes('(ratio)');
	                        }
	                    },
	                    // Sync ratio datasets with legend clicks
	                    onClick: function (e, legendItem, legend) {
	                        const chart = legend.chart;
	                        const index = legendItem.datasetIndex;
						
	                        // dataset 0 -> Meta (money), link to index 2 (Meta ratio)
	                        // dataset 1 -> Google (money), link to index 3 (Google ratio)
	                        let ratioIndex = null;
	                        if (index === 0) ratioIndex = 2;
	                        if (index === 1) ratioIndex = 3;
						
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
	                                return `${baseLabel}: ₹ ${raw.toLocaleString()}`;
	                            }
	                            if (stage === 'ROI') {
	                                // raw is percent
	                                return `${baseLabel}: ${raw.toFixed(1)}%`;
	                            }
	                            if (stage === 'ROAS') {
	                                // raw is percent, convert back to x
	                                const xVal = raw / 100;
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
	                // Money axis (left)
	                y: {
	                    position: 'left',
						stacked: true,
	                    beginAtZero: true,
	                    ticks: {
	                        callback: function (value) {
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
	                    }
	                },
	                // Percentage axis (right) for ROI & ROAS
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
						backgroundColor: metaColor,
                    },
                    {
                        label: 'Paid CAC',
                        data: paidCAC,
                        tension: 0.2,
                        fill: false,
						borderColor: googleColor,
						backgroundColor: googleColor,
						borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: (ctx) =>
                                `${ctx.dataset.label}: ₹ ${ctx.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => `₹${value}`
                        }
                    }
                }
            }
        });
        scalexDetailCharts.push(chart);
		scalexChartRegistry.set(ctx.canvas, chart);
    })();

	// 3) Meta CAC vs Google CAC – trend lines
	(function () {
	    const { labels, metaCAC, googleCAC } = cacTrendData;
	    const { canvas } = createDetailCard(
	        'Meta CAC vs Google CAC',
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
	                    borderColor: googleColor,
	                    backgroundColor: googleColor,
	                    borderWidth: 2
	                }
	            ]
	        },
	        options: {
	            responsive: true,
	            maintainAspectRatio: false,
	            plugins: {
	                legend: { display: true },
	                tooltip: {
	                    callbacks: {
	                        label: (ctx) =>
	                            `${ctx.dataset.label}: ₹ ${ctx.raw.toLocaleString()}`
	                    }
	                }
	            },
	            scales: {
	                y: {
	                    beginAtZero: false,
	                    ticks: {
	                        callback: (value) => `₹${value}`
	                    }
	                }
	            }
	        }
	    });

	    scalexDetailCharts.push(chart);
	    scalexChartRegistry.set(ctx.canvas, chart);
	})();

    // 4) Paid Campaign ROI (%) by stage
    (function () {
        const { labels, metaRoiPercent, googleRoiPercent } = paidCampaignRoiByStage;
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
                    { label: 'Meta', data: metaRoiPercent, backgroundColor: metaColor, borderColor: metaColor, borderWidth: 1 },
                    { label: 'Google', data: googleRoiPercent, backgroundColor: googleColor, borderColor: googleColor, borderWidth: 1 }
                ],
            },
            options: {
                responsive: true,
				indexAxis: 'x',
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
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

    // 4) Pipeline value attributed to marketing
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
						borderColor: googleColor,
						backgroundColor: googleColor,
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
                                `₹ ${ctx.raw.toLocaleString()}`
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

    // 5) LTV:CAC ratio card (no chart)
    (function () {
        const { ltv, cac, ratio, status } = ltvCacSummary;
        const { card } = createDetailCard(
            'LTV : CAC Ratio',
            null,
            false // no canvas
        );
        if (!card) return;

        const body = document.createElement('div');
        body.className = 'detail-ltv-body';

        const ratioEl = document.createElement('div');
        ratioEl.className = 'detail-ltv-ratio';
        ratioEl.textContent = `${ratio.toFixed(1)} : 1`;

        const subEl = document.createElement('p');
        subEl.className = 'detail-ltv-subtext';
        subEl.textContent = `Avg LTV: ₹ ${ltv.toLocaleString()} · CAC: ₹ ${cac.toLocaleString()}`;

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

    // 6) LTV cohorts chart
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
						backgroundColor: googleColor,
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
                            label: (ctx) => `₹ ${ctx.raw.toLocaleString()}`
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

    // 7) Attribution Accuracy Rate (vs baseline)
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
						backgroundColor: googleColor,
						borderColor: googleColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true },
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

    // 8) Top channels by ROAS
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
						backgroundColor: googleColor,
						borderColor: googleColor
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
}
