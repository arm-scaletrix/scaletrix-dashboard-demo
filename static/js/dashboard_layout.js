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
            backgroundColor: '#020817'
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
        ctx.fillStyle = '#020817'; // match dashboard background
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

    if (sidebarLinks.length > 0 && heading) {
        sidebarLinks[0].classList.add('active');
        heading.textContent = sidebarLinks[0].textContent.trim();
    }

    if (typeof window.fetchAndDisplayUserData === 'function') {
        window.fetchAndDisplayUserData();
    }
});


// --- KPI card testing with sample data ---
    // ---- Sample monthly data (assumed) ----
    // We compare current month to previous month up to "today's" day-of-month.
    // In real use, replace these with values from your FastAPI API.

    const sampleData = {
      revenue: {
        // e.g., daily revenue for current & previous month
        current: [1200, 1350, 1600, 1550, 1800, 1750, 1900, 2000, 2100, 2200, 2300, 2250, 2400, 2500, 2600],
        previous: [1000, 1100, 1200, 1300, 1350, 1400, 1450, 1500, 1550, 1600, 1620, 1650, 1700, 1750, 1800]
      },
      spend: {
        current: [400, 420, 450, 460, 480, 500, 520, 530, 540, 560, 570, 580, 600, 610, 620],
        previous: [380, 390, 400, 405, 410, 420, 430, 435, 440, 445, 450, 455, 460, 465, 470]
      },
      roas: {
        // treat as daily blended value; we'll average up to date
        current: [2.8, 3.0, 3.1, 3.0, 3.2, 3.3, 3.4, 3.5, 3.4, 3.6, 3.7, 3.6, 3.8, 3.9, 4.0],
        previous: [2.4, 2.5, 2.6, 2.7, 2.7, 2.8, 2.9, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.2, 3.3]
      },
      roi: {
        // percentage points
        current: [42, 44, 45, 47, 48, 49, 50, 52, 51, 53, 54, 55, 56, 57, 58],
        previous: [35, 36, 37, 38, 39, 40, 41, 42, 42, 43, 44, 44, 45, 45, 46]
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
      new Chart(ctx, {
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
    }

    document.addEventListener('DOMContentLoaded', renderKpiCards);
