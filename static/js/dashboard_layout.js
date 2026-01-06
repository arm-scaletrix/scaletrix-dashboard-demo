/* ============================================================================
 * dashboard_layout.js
 * 
 * ScaleX Dashboard - Layout, DOM Manipulation & User Interaction Logic
 * 
 * ===========================================================================
 * RESPONSIBILITIES:
 * ===========================================================================
 * 1. Filter section toggle (accordion style UI)
 * 2. Date range picker initialization and management
 * 3. Dashboard export functionality (PNG/PDF)
 * 4. Client profile / ads connection modal
 * 5. Page initialization and event handling
 * 6. Sidebar navigation and tab switching
 * 7. Export menu management
 * 8. Chart modal integration
 * 
 * ===========================================================================
 * DEPENDENCIES:
 * ===========================================================================
 * - dashboard_charts.js (chart rendering functions)
 *   Requires: renderKpiCards(), renderPerformanceOverviewDetails(),
 *            renderChannelCampaignDetails(), clearDetailCharts(),
 *            openChartModalFromCanvas(), closeChartModal(),
 *            downloadModalChart()
 * 
 * - dashboard_chart_api.js (API communication)
 *   Requires: refreshPage(), getStoredFilters(), buildPayload()
 * 
 * - HTML Libraries:
 *   • Chart.js (for chart rendering)
 *   • html-to-image (for dashboard export to PNG)
 *   • jsPDF (for PDF export)
 *   • Lucide Icons (for icon rendering)
 *   • Moment.js (for date handling)
 *   • jQuery DateRangePicker (for date selection)
 * 
 * - HTML markup with required element IDs:
 *   • filter-content, filter-toggle-arrow
 *   • main-content, main-heading
 *   • client-id-display, client-modal-backdrop
 *   • daterangepicker
 *   • errorMessage, successMessage
 *   • export-toggle, export-menu
 *   • chart-modal, chart-modal-close
 *   • smart-alerts, kpi-cards, detail-charts
 *   • sidebar-link (multiple)
 * 
 * ===========================================================================
 * CALLED BY:
 * ===========================================================================
 * - HTML page load event (DOMContentLoaded)
 * 
 * ===========================================================================
 * CALLS:
 * ===========================================================================
 * Chart Functions:
 * - renderKpiCards()
 * - renderPerformanceOverviewDetails()
 * - renderChannelCampaignDetails()
 * - clearDetailCharts()
 * - openChartModalFromCanvas()
 * - closeChartModal()
 * - downloadModalChart()
 * 
 * API Functions:
 * - refreshPage(pageKey)
 * - getStoredFilters()
 * - buildPayload()
 * 
 * ===========================================================================
 * VERSION HISTORY:
 * ===========================================================================
 * v1.0 - 2025-12-11 - Initial refactored version with proper organization
 * 
 * ========================================================================== */




/* ============================================================================
 * SECTION 1: FILTER SECTION TOGGLE (Accordion Style)
 * ============================================================================
 * 
 * Handles the collapsible filter section in the header.
 * Allows users to show/hide filter options.
 * 
 * ========================================================================== */

/**
 * 1.1 - Toggle filter section visibility
 * 
 * Toggles the filter section between expanded and collapsed states.
 * Updates the arrow icon to indicate state.
 * Uses Lucide icons for visual feedback.
 * 
 * @function
 * @returns {void}
 * 
 * @example
 * window.toggleFilterSection()
 */
window.toggleFilterSection = function () {
    const filterContent = document.getElementById('filter-content');
    const filterArrow = document.getElementById('filter-toggle-arrow');
    
    // Safety check: ensure elements exist
    if (!filterContent || !filterArrow) return;

    // Check if section is currently hidden
    const opening = filterContent.classList.contains('hidden');

    if (opening) {
        // Show section
        filterContent.classList.remove('hidden');
        filterArrow.setAttribute('data-lucide', 'chevron-up');
    } else {
        // Hide section
        filterContent.classList.add('hidden');
        filterArrow.setAttribute('data-lucide', 'chevron-down');
    }

    // Update Lucide icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }
};




/* ============================================================================
 * SECTION 2: DATE RANGE PICKER & FILTER STATE MANAGEMENT
 * ============================================================================
 * 
 * Manages date range selection and filter state persistence.
 * Uses moment.js for date manipulation and jQuery DateRangePicker for UI.
 * Stores state in sessionStorage for persistence across page reloads.
 * 
 * ========================================================================== */

/**
 * 2.1 - Date Filter Configuration
 * 
 * Contains API endpoint configuration for date filter requests.
 * Defines storage keys and HTTP headers.
 * 
 * @const {Object}
 */
const dateFilterConfig = {
    apiEndpoint: '/api/data/filter',
    apiMethod: 'POST',
    apiHeaders: {
        'Content-Type': 'application/json',
    },
    storageKey: 'dateRange'
};


/**
 * 2.2 - Filter State Object
 * 
 * Tracks current filter state in memory.
 * Updated when user selects new date range.
 * 
 * @var {Object}
 * @property {moment.Moment|null} startDate - Start date of filter range
 * @property {moment.Moment|null} endDate - End date of filter range
 */
let filterState = {
    startDate: null,
    endDate: null
};


/**
 * 2.3 - Store date range in sessionStorage
 * 
 * Persists selected date range to sessionStorage for:
 * - Maintaining state across page reloads
 * - Sharing filter state between components
 * - API payload building
 * 
 * @function
 * @param {moment.Moment} startDate - Start date of range
 * @param {moment.Moment} endDate - End date of range
 * @returns {Object} Stored payload object
 * 
 * @example
 * const payload = storeDateRange(moment('2025-01-01'), moment('2025-01-31'))
 */
function storeDateRange(startDate, endDate) {
    const payload = {
        dateRange: {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD')
        },
        comparison: false,
        timestamp: moment().toISOString()
    };

    sessionStorage.setItem(dateFilterConfig.storageKey, JSON.stringify(payload));
    // Now refresh current page charts
    if (window.refreshPage) {
        window.refreshPage(); // uses CURRENT_PAGE by default
    }
    return payload;
}


/**
 * 2.4 - Retrieve stored date range from sessionStorage
 * 
 * Gets previously stored date range from browser session storage.
 * Returns null if no stored range exists.
 * 
 * @function
 * @returns {Object|null} Stored date range object or null
 * 
 * @example
 * const stored = getStoredDateRange()
 * if (stored && stored.dateRange) {
 *     const startDate = moment(stored.dateRange.startDate)
 *     const endDate = moment(stored.dateRange.endDate)
 * }
 */
function getStoredDateRange() {
    const stored = sessionStorage.getItem(dateFilterConfig.storageKey);
    return stored ? JSON.parse(stored) : null;
}


/**
 * 2.5 - Initialize DateRangePicker
 * 
 * Sets up the jQuery DateRangePicker UI component.
 * Includes:
 * - Default date range (last 7 days)
 * - Preset quick select options
 * - Min/max date constraints
 * - Custom range capability
 * - Locale customization
 * 
 * Persists selection to sessionStorage via callback.
 * 
 * @function
 * @returns {void}
 * 
 * Called during page initialization in DOMContentLoaded
 */
function initializeDateRangePicker() {
    // Check if there's a previously stored date range
    const stored = getStoredDateRange();
    
    // Set default: last 7 days
    let startDate = moment().subtract(7, 'days');
    let endDate = moment().subtract(1, 'days');

    // Override with stored values if they exist
    if (stored && stored.dateRange) {
        startDate = moment(stored.dateRange.startDate);
        endDate = moment(stored.dateRange.endDate);
    }
    
    // Persist the date range
    storeDateRange(startDate, endDate);

    // Initialize jQuery DateRangePicker component
    $('#daterangepicker').daterangepicker({
        startDate: startDate,
        endDate: endDate,
        minDate: moment().subtract(1, 'years'),
        maxDate: moment(),
        dateLimit: { days: 365 },
        showCustomRangeLabel: true,
        alwaysShowCalendars: true,
        opens: 'center',
        drops: 'down',
        buttonClasses: ['btn', 'btn-sm'],
        
        // Preset date range options
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'day'), moment().subtract(1, 'day')],
            'This Week': [moment().startOf('week'), moment()],
            'Last Week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
            'This Month': [moment().startOf('month'), moment()],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            'Last 7 Days': [moment().subtract(7, 'days'), moment().subtract(1, 'days')],
            'Last 14 Days': [moment().subtract(14, 'days'), moment().subtract(1, 'days')],
            'Last 30 Days': [moment().subtract(30, 'days'), moment().subtract(1, 'days')],
            'Last 90 Days': [moment().subtract(90, 'days'), moment().subtract(1, 'days')]
        },
        
        // Locale settings for display
        locale: {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            customRangeLabel: 'Custom',
            daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'],
            firstDay: 1
        }
    }, function(start, end, label) {
        // Callback fired when user applies a date range selection
        filterState.startDate = start.clone();
        filterState.endDate = end.clone();
        
        // Immediately persist to sessionStorage
        storeDateRange(filterState.startDate, filterState.endDate);
    });

    // Initialize filter state from stored or default values
    if (stored) {
        filterState.startDate = startDate;
        filterState.endDate = endDate;
    } else {
        filterState.startDate = startDate;
        filterState.endDate = endDate;
    }
}


/**
 * 2.6 - Make date utilities globally accessible
 * 
 * Exposes key functions to global window object for use in other scripts.
 */
window.getStoredDateRange = getStoredDateRange;
window.storeDateRange = storeDateRange;




/* ============================================================================
 * SECTION 3: FILTER ACTIONS & UTILITY FUNCTIONS
 * ============================================================================
 * 
 * Handles user interactions with filter controls.
 * Provides feedback to user for filter actions.
 * 
 * ========================================================================== */

/**
 * 3.1 - Show notification message to user
 * 
 * Displays temporary message (info, success, or error) to user.
 * Message auto-dismisses after 5 seconds.
 * 
 * @function
 * @param {string} message - Message text to display
 * @param {string} [type='info'] - Message type: 'info', 'success', or 'error'
 * @returns {void}
 * 
 * @example
 * showMessage('Data saved successfully', 'success')
 * showMessage('An error occurred', 'error')
 */
function showMessage(message, type = 'info') {
    const messageEl = type === 'error' ? document.getElementById('errorMessage') : 
                    type === 'success' ? document.getElementById('successMessage') : null;
    
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.classList.add('show');
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => messageEl.classList.remove('show'), 5000);
    }
}


/**
 * 3.2 - Handle filter submit action
 * 
 * Called when user clicks "Apply Filters" button.
 * Currently a placeholder for future API integration.
 * Will trigger API call to fetch filtered data.
 * 
 * @function
 * @returns {void}
 */
function handleFilterSubmit() {
    // TODO: Implement filter submission logic
    // - Call API with current filter state
    // - Show loading indicator
    // - Refresh dashboard data
    // - Show success/error message
    window.refreshPage();
}


/**
 * 3.3 - Handle filter reset action
 * 
 * Resets filters to default state (last 7 days).
 * Clears sessionStorage.
 * Updates DateRangePicker UI.
 * Persists new default range.
 * 
 * @function
 * @returns {void}
 */
function handleFilterReset() {
    // Clear sessionStorage
    sessionStorage.removeItem(dateFilterConfig.storageKey);
    
    // Reset to default: last 7 days
    const start = moment().subtract(7, 'days');
    const end = moment().subtract(1, 'days');
    
    // Update in-memory filter state
    filterState.startDate = start;
    filterState.endDate = end;
    
    // Update DateRangePicker UI
    $('#daterangepicker').data('daterangepicker').setStartDate(start);
    $('#daterangepicker').data('daterangepicker').setEndDate(end);
    $('#daterangepicker').val(start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY'));

    // Persist the reset range to sessionStorage
    storeDateRange(start, end);
}




/* ============================================================================
 * SECTION 4: DASHBOARD EXPORT (PNG/PDF)
 * ============================================================================
 * 
 * Exports the dashboard main content as PNG or PDF image.
 * Uses html-to-image library for PNG capture.
 * Uses jsPDF library for PDF generation.
 * Adds margins and background color for professional appearance.
 * 
 * ========================================================================== */

/**
 * 4.1 - Export dashboard to PNG or PDF
 * 
 * Captures the dashboard main content area and exports as image.
 * Process:
 * 1. Hides filter section for cleaner export
 * 2. Captures content as high-resolution PNG (2x pixel ratio)
 * 3. Adds margins and background color
 * 4. Either downloads as PNG directly or converts to PDF
 * 
 * @async
 * @function
 * @param {string} format - Export format: 'png' or 'pdf'
 * @returns {Promise<void>}
 * 
 * @throws Will log error to console if libraries not loaded or capture fails
 * 
 * @example
 * await exportDashboard('png')
 * await exportDashboard('pdf')
 */
async function exportDashboard(format) {
    try {
        // Safety check: ensure html-to-image library is loaded
        if (!window.htmlToImage) {
            console.error('html-to-image not loaded');
            return;
        }

        // Get jsPDF library if available (for PDF export)
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        
        // Get target element: main content area only (not sidebar)
        const target = document.getElementById('main-content');

        if (!target) {
            console.error('No #main-content found for export.');
            return;
        }

        // Hide filter section for cleaner export appearance
        const filterSection = document.getElementById('filter-section');
        const prevDisplay = filterSection ? filterSection.style.display : null;
        if (filterSection) filterSection.style.display = 'none';

        // Ensure top of page is visible for full capture
        window.scrollTo(0, 0);

        // Step 1: Capture main-content as high-resolution PNG
        // pixelRatio: 2 = double resolution (2x2 pixels per logical pixel)
        const rawDataUrl = await htmlToImage.toPng(target, {
            pixelRatio: 2,
            backgroundColor: '#164348'  // Dashboard background color
        });

        // Restore filter section visibility after capture
        if (filterSection) filterSection.style.display = prevDisplay ?? '';

        // Step 2: Wrap PNG in canvas with uniform margin
        const MARGIN_PX = 40;
        const img = new Image();
        img.src = rawDataUrl;
        await img.decode();

        // Create canvas larger than image to add margins
        const canvas = document.createElement('canvas');
        canvas.width = img.width + MARGIN_PX * 2;
        canvas.height = img.height + MARGIN_PX * 2;

        // Fill canvas background and draw image
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#164348';  // Match dashboard background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, MARGIN_PX, MARGIN_PX);

        // Convert final canvas to data URL
        const finalDataUrl = canvas.toDataURL('image/png');

        // Step 3a: PNG DOWNLOAD
        if (format === 'png') {
            const link = document.createElement('a');
            link.href = finalDataUrl;
            link.download = 'scalex-dashboard.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            return;
        }

        // Step 3b: PDF DOWNLOAD
        if (format === 'pdf') {
            // Verify jsPDF is available
            if (!jsPDF) {
                console.error('jsPDF not available');
                return;
            }

            // Convert pixel dimensions to millimeters (25.4 mm = 1 inch = 96 px at 96 dpi)
            const PX_TO_MM = 25.4 / 96;
            const pdfWidth = canvas.width * PX_TO_MM;
            const pdfHeight = canvas.height * PX_TO_MM;
            
            // Determine page orientation based on dimensions
            const orientation = pdfWidth > pdfHeight ? 'l' : 'p';

            // Create PDF with exact image dimensions (no extra white space)
            const pdf = new jsPDF({
                orientation,
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            // Add image to PDF page
            pdf.addImage(finalDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Save and download PDF file
            pdf.save('scalex-dashboard.pdf');
        }
    } catch (err) {
        console.error('Export failed:', err);
    }
}




/* ============================================================================
 * SECTION 5: CLIENT PROFILE / ADS CONNECTION MODAL
 * ============================================================================
 * 
 * Manages client information modal that appears when user clicks client ID.
 * Displays client details and provides OAuth connection options.
 * Allows users to connect Google Ads and Meta Ads accounts.
 * 
 * ========================================================================== */

/**
 * 5.1 - Client Modal Initialization (IIFE)
 * 
 * Uses Immediately Invoked Function Expression (IIFE) to encapsulate
 * modal state and prevent variable pollution of global scope.
 * 
 * Handles:
 * - Opening modal on client ID click
 * - Closing modal on button click or backdrop click
 * - Building OAuth URLs with client ID parameter
 * - Managing modal visibility
 */
(function () {
    // ===== Element References =====
    const clientIdDisplay = document.getElementById('client-id-display');
    const modalBackdrop = document.getElementById('client-modal-backdrop');
    const closeBtn = document.getElementById('client-modal-close');
    const clientIdValueEl = document.getElementById('client-modal-client-id');
    const clientEmailEl = document.getElementById('client-modal-client-email');

    const googleBtn = document.getElementById('google-ads-connect');
    const metaBtn = document.getElementById('meta-ads-connect');
    const googleLink = document.getElementById('google-ads-link');
    const metaLink = document.getElementById('meta-ads-link');

    // Safety guard: exit if required elements don't exist
    if (!clientIdDisplay || !modalBackdrop) {
        return;
    }

    /**
     * 5.2 - Open Client Modal
     * 
     * Displays client information modal.
     * Extracts client ID from header display element.
     * Builds dynamic OAuth URLs with client ID parameter.
     * Updates modal DOM elements with client information.
     * 
     * @function
     * @returns {void}
     */
    async function openClientModal() {
        // Read client ID from header element
        const rawText = clientIdDisplay.textContent || '';
        const cleanedClientId = rawText.trim();

        // Display client ID in modal
        if (clientIdValueEl) {
            clientIdValueEl.textContent = cleanedClientId || '--';
        }

        // TODO: Replace with actual email from backend API when available
        if (clientEmailEl && !clientEmailEl.textContent.trim()) {
            clientEmailEl.textContent = 'client@example.com';
        }

        // Build dynamic OAuth URLs with client ID parameter
        const clientIdParam = encodeURIComponent(cleanedClientId || '');
        
        // Set Google Ads OAuth link
        if (googleLink) {
            const baseUrl = googleLink.dataset.baseUrl;
            if (baseUrl && clientIdParam) {
                googleLink.href = `${baseUrl}?client_id=${clientIdParam}`;
            }
        }

        // Set Meta Ads OAuth link
        if (metaLink) {
            const baseUrl = metaLink.dataset.baseUrl;
            if (baseUrl && clientIdParam) {
                metaLink.href = `${baseUrl}?client_id=${clientIdParam}`;
            }
        }

        /**
         * Phase 2: refresh Ads integration status
         * Hook: when profile popup opens, refresh status
         * Call this when profile modal becomes visible
         */
        // Show loader first
        showGlobalLoader();

        try {
            // Fetch + update UI BEFORE opening the modal
            // loadIntegrationStatus is async already
            await window.loadIntegrationStatus();
        } catch (err) {
            console.error("Phase2: loadIntegrationStatus failed:", err);
            // Optional: you can still open modal even if status fails
        } finally {
            // Hide loader
            hideGlobalLoader();
        }

        // Show modal
        modalBackdrop.classList.remove('hidden');
        document.body.classList.add('client-modal-open');

    }

    /**
     * 5.3 - Close Client Modal
     * 
     * Hides the modal and cleans up state.
     * Can be called from close button or backdrop click.
     * 
     * @function
     * @returns {void}
     */
    function closeClientModal() {
        modalBackdrop.classList.add('hidden');
        document.body.classList.remove('client-modal-open');
    }

    // ===== Event Handlers =====
    
    // Open modal when user clicks client ID in header
    clientIdDisplay.addEventListener('click', openClientModal);

    // Close modal when user clicks X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeClientModal);
    }

    // Close modal when clicking outside (on dark backdrop)
    modalBackdrop.addEventListener('click', (evt) => {
        if (evt.target === modalBackdrop) {
            closeClientModal();
        }
    });

    // Google Ads connect button placeholder
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            console.log('TODO: trigger Google Ads OAuth popup for this client');
            // TODO: Implement Google Ads OAuth flow
            // Later: redirect to /oauth/google?client_id=...
        });
    }

    // Meta Ads connect button placeholder
    if (metaBtn) {
        metaBtn.addEventListener('click', () => {
            console.log('TODO: trigger Meta Ads OAuth popup for this client');
            // TODO: Implement Meta Ads OAuth flow
            // Later: redirect to /oauth/meta?client_id=...
        });
    }
})();




/* ============================================================================
 * SECTION 6: PAGE INITIALIZATION (DOMContentLoaded)
 * ============================================================================
 * 
 * Main initialization function called when DOM is fully loaded.
 * Sets up all UI components, event listeners, and initial data rendering.
 * 
 * Initialization Order:
 * 1. Lucide icons initialization
 * 2. Date range picker setup
 * 3. Export menu toggle
 * 4. Chart modal button bindings
 * 5. Export option handlers
 * 6. Sidebar navigation setup
 * 7. Default view handlers
 * 8. Initial data rendering
 * 
 * ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    /**
     * 6.1 - Initialize Lucide Icons
     * 
     * Sets up icon rendering if Lucide library is loaded.
     * This allows dynamic icon updates throughout the application.
     */
    if (window.lucide) {
        window.lucide.createIcons();
    }

    /**
     * 6.2 - Initialize Date Range Picker
     * 
     * Sets up the date range picker component.
     * Loads previously stored date range if available.
     * Makes filter state globally accessible.
     */
    initializeDateRangePicker();
    
    // Check for existing stored data (may be used by other components)
    const stored = getStoredDateRange();


    /**
     * 6.3 - Export Menu Toggle Setup
     * 
     * Manages the export dropdown menu that appears when user clicks
     * the export button in the header. Includes PNG and PDF options.
     * 
     * Shows menu on button click.
     * Hides menu when clicking elsewhere on page.
     */
    const exportToggle = document.getElementById('export-toggle');
    const exportMenu = document.getElementById('export-menu');

    // Toggle menu visibility on click
    document.addEventListener('click', function (e) {
        if (!exportToggle || !exportMenu) return;

        if (exportToggle.contains(e.target)) {
            // User clicked export button: toggle menu
            exportMenu.classList.toggle('hidden');
        } else if (!exportMenu.contains(e.target)) {
            // User clicked elsewhere: close menu
            exportMenu.classList.add('hidden');
        }
    });


    /**
     * 6.4 - Fullscreen Chart Modal Button Bindings
     * 
     * Sets up event listeners for chart modal controls:
     * - Close button
     * - Download as PNG button
     * - Download as PDF button
     * - Backdrop click to close
     * 
     * Integrates with chart rendering functions from dashboard_charts.js
     */
    const modalClose = document.getElementById('chart-modal-close');
    const modalPng = document.getElementById('chart-modal-download-png');
    const modalPdf = document.getElementById('chart-modal-download-pdf');
    const modal = document.getElementById('chart-modal');

    // Close button click handler
    if (modalClose) {
        modalClose.addEventListener('click', closeChartModal);
    }
    
    // PNG download button handler
    if (modalPng) {
        modalPng.addEventListener('click', () => downloadModalChart('png'));
    }
    
    // PDF download button handler
    if (modalPdf) {
        modalPdf.addEventListener('click', () => downloadModalChart('pdf'));
    }

    // Close modal when clicking dark background (but not the modal card itself)
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeChartModal();
            }
        });
    }


    /**
     * 6.5 - Export Options Click Handlers
     * 
     * Handles user clicks on PNG/PDF export options in the export menu.
     * Calls exportDashboard() with selected format.
     * Closes menu after selection.
     */
    const exportOptions = document.querySelectorAll('.export-option');
    exportOptions.forEach(btn => {
        btn.addEventListener('click', async function () {
            // Get export format from data attribute
            const format = this.getAttribute('data-format');
            
            // Close export menu
            if (exportMenu) exportMenu.classList.add('hidden');
            
            // Trigger export
            await exportDashboard(format);
        });
    });


    /**
     * 6.6 - Sidebar Navigation Setup
     * 
     * Sets up click handlers for sidebar links (dashboard tabs).
     * Updates active state, heading, and rendered charts on tab switch.
     * Integrates with chart rendering from dashboard_charts.js.
     * 
     * Key functionality:
     * - Update active sidebar link
     * - Update page heading
     * - Store active page in sessionStorage
     * - Render appropriate detail charts
     * - Trigger API refresh
     */
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const heading = document.getElementById('main-heading');

    /**
     * 6.6.1 - Helper: Clear Active State
     * 
     * Removes 'active' class from all sidebar links.
     * Called before updating to new active link.
     */
    function clearActive() {
        sidebarLinks.forEach(link => link.classList.remove('active'));
    }

    /**
     * 6.6.2 - Helper: Map Link Label to Analysis Key
     * 
     * Converts sidebar link text to internal page key.
     * Used for routing to correct chart rendering function.
     * 
     * @param {string} label - Sidebar link text
     * @returns {string} Page key (e.g., 'performance-overview')
     */
    function getAnalysisKey(label) {
        const text = label.toLowerCase();
        if (text.includes('performance overview')) return 'performance-overview';
        if (text.includes('channel') || text.includes('campaign')) return 'channel-campaign-analytics';
        if (text.includes('attribution') || text.includes('signal')) return 'attribution-signal-health';
        if (text.includes('funnel') || text.includes('journey')) return 'funnel-lead-journey';
        return 'performance-overview';  // Default fallback
    }

    /**
     * 6.6.3 - Sidebar Link Click Event Handler
     * 
     * Called when user clicks a sidebar navigation link.
     * Updates UI to show selected tab and renders appropriate charts.
     */
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function () {
            const label = this.textContent.trim();
            const key = getAnalysisKey(label);

            // Update active state
            clearActive();
            this.classList.add('active');
            if (heading) heading.textContent = label;

            // Store active page in sessionStorage for state persistence
            sessionStorage.setItem('activePage', key);

            // Render filters UI for this analysis type
            if (typeof window.renderFiltersForAnalysis === 'function') {
                window.renderFiltersForAnalysis(key);
            }

            // Update UI layout (show/hide sections, adjust styling)
            if (typeof window.handleAnalysisViewChange === 'function') {
                window.handleAnalysisViewChange(key);
            }

            // Trigger API refresh to fetch data for this page
            if (typeof window.refreshPage === 'function') {
                window.refreshPage(key);
            }
        });
    });


    /**
     * 6.7 - Default Analysis View Change Handler
     * 
     * Fallback handler for view changes if dashboard_charts.js is not loaded.
     * Manages visibility of UI sections based on selected analysis type.
     * 
     * Responsibilities:
     * - Show/hide smart alerts section
     * - Show/hide KPI cards
     * - Render appropriate detail charts
     * - Clear and update chart area
     */
    if (typeof window.handleAnalysisViewChange !== 'function') {
        window.handleAnalysisViewChange = function (key) {
            const smartAlertsSection = document.getElementById('smart-alerts');
            const kpiSectionEl = document.getElementById('kpi-cards');

            /**
             * Smart Alerts: Show only on Performance Overview page
             * Other pages don't need alert indicators
             */
            if (smartAlertsSection) {
                if (key === 'performance-overview') {
                    smartAlertsSection.classList.remove('hidden');
                } else {
                    smartAlertsSection.classList.add('hidden');
                }
            }

            /**
             * KPI Cards: Show only on Performance Overview page
             * Other pages focus on specific analytics
             */
            if (kpiSectionEl) {
                if (key === 'performance-overview') {
                    kpiSectionEl.style.display = '';
                } else {
                    kpiSectionEl.style.display = 'none';
                }
            }

            /**
             * Detail Charts Routing: Render appropriate charts for selected view
             */
            if (key === 'performance-overview') {
                // Performance Overview page: show performance metrics
                if (typeof renderPerformanceOverviewDetails === 'function') {
                    renderPerformanceOverviewDetails();
                }
            } else if (key === 'channel-campaign-analytics') {
                // Channel & Campaign page: show channel-specific metrics
                if (typeof renderChannelCampaignDetails === 'function') {
                    renderChannelCampaignDetails();
                }
            } else {
                // Other pages: clear charts and show placeholder
                if (typeof clearDetailCharts === 'function') {
                    clearDetailCharts();
                }
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


    /**
     * 6.8 - Set Default Active Sidebar Link and Heading
     * 
     * On initial page load, set first sidebar link as active.
     * Updates heading to match first link's text.
     */
    if (sidebarLinks.length > 0 && heading) {
        sidebarLinks[0].classList.add('active');
        heading.textContent = sidebarLinks[0].textContent.trim();
    }


    /**
     * 6.9 - Load User Data (if available)
     * 
     * Calls optional user data loading function if defined elsewhere.
     * Used to populate header with user information, name, email, etc.
     */
    if (typeof window.fetchAndDisplayUserData === 'function') {
        window.fetchAndDisplayUserData();
    }


    /**
     * 6.10 - Initial View Render for Performance Overview
     * 
     * Renders the default analysis view (Performance Overview).
     * Called to set up UI sections before chart rendering.
     * Handles visibility of alerts, KPIs, and section layout.
     */
    if (typeof window.handleAnalysisViewChange === 'function') {
        window.handleAnalysisViewChange('performance-overview');
    }


    /**
     * 6.11 - Initial API Load for Performance Overview
     * 
     * Fetches chart data from backend API for default view.
     * Called after UI is set up.
     * Integrates with dashboard_chart_api.js for data fetching.
     * 
     * Only called if API layer is loaded and available.
     */
    if (typeof window.refreshPage === 'function') {
        window.refreshPage('performance-overview');
    }


    /**
     * 6.12 - Initial KPI Card Render
     * 
     * Renders KPI cards with sparklines and metrics.
     * Uses sample data from dashboard_charts.js.
     * Should be called after page layout is ready.
     * 
     * Only called if chart rendering functions are loaded.
     */
    // if (typeof renderKpiCards === 'function') {
    //     renderKpiCards();
    // }
});

/******************************************************************
 * Phase 2 – Ads Integrations Status Handling (FRESH + FIXED)
 * ---------------------------------------------------------------
 * - Fetch integration status from backend
 * - Update Profile popup UI (anchors: #google-ads-link, #meta-ads-link)
 * - Listen for OAuth completion from popup window
 ******************************************************************/

// Backend base URL (Cloud Run)
const ADS_CONNECTOR_BASE_URL = "https://scalex-ads-connector-ohkoqzgrzq-el.a.run.app";

// Security: only accept postMessage from this origin
const ADS_CONNECTOR_ORIGIN = new URL(ADS_CONNECTOR_BASE_URL).origin;

function showGlobalLoader() {
    const loaderEl = document.getElementById("loader");
    if (loaderEl) loaderEl.classList.remove("hidden");
}

function hideGlobalLoader() {
    const loaderEl = document.getElementById("loader");
    if (loaderEl) loaderEl.classList.add("hidden");
}

/**
 * Get the active client_id.
 * Priority:
 * 1) Modal field (#client-modal-client-id) if present (popup open)
 * 2) Header field (#client-id-display)
 */
function getActiveClientId() {
    const modalClientEl = document.getElementById("client-modal-client-id");
    const headerClientEl = document.getElementById("client-id-display");

    const modalClientId = (modalClientEl?.textContent || "").trim();
    if (modalClientId && modalClientId !== "--") return modalClientId;

    const headerClientId = (headerClientEl?.textContent || "").trim();
    return headerClientId || "";
}

/**
 * Update a single platform anchor based on connection status.
 * This is designed for <a> tags (not <button>).
 */
function applyPlatformUI(anchorEl, platformKey, statusObj) {
    if (!anchorEl) return;

    // Reset
    anchorEl.classList.remove("connected", "reconnect");
    anchorEl.removeAttribute("aria-disabled");

    const connected = Boolean(statusObj?.connected);
    const state = (statusObj?.status || "").toLowerCase(); // active / disconnected / etc.

    // Default label (connect)
    const label = platformKey === "google_ads" ? "Google Ads" : "Meta Ads";

    if (!connected) {
        anchorEl.textContent = `Connect ${label}`;
        // Anchor remains clickable (href is already set by openClientModal)
        return;
    }

    if (state === "active") {
        anchorEl.textContent = `${label} Connected ✅`;
        anchorEl.classList.add("connected");
        anchorEl.setAttribute("aria-disabled", "true");
        // CSS handles pointer-events: none for .connected (already in styles.css)
        return;
    }

    // Anything not active but connected -> reconnect state
    anchorEl.textContent = `Reconnect ${label} ⚠️`;
    anchorEl.classList.add("reconnect");
    // Keep clickable so user can re-run OAuth
}

/**
 * Update the popup UI based on backend response.
 * Expected structure:
 * {
 *   google_ads: { connected: bool, status: "active"|"disconnected"|... },
 *   meta_ads:   { connected: bool, status: "active"|"disconnected"|... }
 * }
 */
function updateIntegrationUI(payload) {
    // The two anchors in YOUR HTML
    const googleLink = document.getElementById("google-ads-link");
    const metaLink = document.getElementById("meta-ads-link");

    applyPlatformUI(googleLink, "google_ads", payload?.google_ads);
    applyPlatformUI(metaLink, "meta_ads", payload?.meta_ads);
}

/**
 * Fetch integration status from backend and apply to UI.
 * This can be called:
 * - When modal opens (you already call loadIntegrationStatus() there)
 * - When OAuth popup reports completion (postMessage)
 */
async function loadIntegrationStatus() {
    try {
        const clientId = getActiveClientId();
        if (!clientId) {
            console.warn("Phase2: client_id missing; cannot fetch integration status.");
            return;
        }

        const url = `${ADS_CONNECTOR_BASE_URL}/api/v1/integrations/status?client_id=${encodeURIComponent(clientId)}`;
        const res = await fetch(url);

        if (!res.ok) {
            console.warn("Phase2: failed to load integrations status:", res.status);
            return;
        }

        const data = await res.json();
        updateIntegrationUI(data);
    } catch (err) {
        console.error("Phase2: integration status error:", err);
    }
}

// Expose for openClientModal() call (since it’s inside an IIFE above)
window.loadIntegrationStatus = loadIntegrationStatus;

/**
 * Listen for OAuth completion messages from popup windows.
 * NOTE: This assumes your OAuth success page does:
 * window.opener.postMessage({ type: "SCALEX_OAUTH_DONE", ... }, "<dashboard-origin>");
 */
window.addEventListener("message", function (event) {
    // Security: accept only from Ads Connector origin
    if (event.origin !== ADS_CONNECTOR_ORIGIN) return;

    const msg = event.data;
    if (!msg || msg.type !== "SCALEX_OAUTH_DONE") return;

    // Refresh status immediately (modal can remain open)
    loadIntegrationStatus();
});



/* ============================================================================
 * END OF FILE: dashboard_layout.js
 * 
 * All layout, DOM manipulation, and user interaction logic for the 
 * ScaleX dashboard is contained above.
 * 
 * For chart rendering logic, see: dashboard_charts.js
 * For API communication, see: dashboard_chart_api.js
 * 
 * ========================================================================== */
