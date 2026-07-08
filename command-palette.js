/**
 * Amiele Begena — Command Palette & Global Search Controller
 * Ctrl+K Shortcut Handler, arrow-key index selectors, and action executors.
 */

(function() {
    // 1. Define command registry items
    const registry = [
        // Tab navigations
        { id: 'go_overview', title: 'Go to Overview Dashboard', category: 'Navigation', icon: 'fa-chart-line', action: () => handleTabNav('overview') },
        { id: 'go_referral', title: 'Go to Referral Center', category: 'Navigation', icon: 'fa-link', action: () => handleTabNav('referral') },
        { id: 'go_commissions', title: 'Go to Commissions Log', category: 'Navigation', icon: 'fa-wallet', action: () => handleTabNav('commissions') },
        { id: 'go_payouts', title: 'Go to Payout Requests', category: 'Navigation', icon: 'fa-hand-holding-usd', action: () => handleTabNav('withdrawals') },
        { id: 'go_performance', title: 'Go to Performance Reports', category: 'Navigation', icon: 'fa-file-invoice-dollar', action: () => handleTabNav('performance') },
        { id: 'go_marketing', title: 'Go to Marketing Materials', category: 'Navigation', icon: 'fa-photo-video', action: () => handleTabNav('marketing') },
        { id: 'go_campaigns', title: 'Go to Bonus Campaigns', category: 'Navigation', icon: 'fa-trophy', action: () => handleTabNav('campaigns') },
        { id: 'go_settings', title: 'Go to Settings Profile', category: 'Navigation', icon: 'fa-cog', action: () => handleTabNav('settings') },
        
        // Admin panel specific tabs (conditional validation)
        { id: 'admin_dashboard', title: 'Admin: Overview Dashboard', category: 'Admin Panel', icon: 'fa-chart-pie', action: () => handleAdminNav('dashboard') },
        { id: 'admin_users', title: 'Admin: Manage System Users', category: 'Admin Panel', icon: 'fa-users', action: () => handleAdminNav('users') },
        { id: 'admin_apps', title: 'Admin: Review Applications Queue', category: 'Admin Panel', icon: 'fa-user-check', action: () => handleAdminNav('applications') },
        { id: 'admin_comms', title: 'Admin: Approve Commissions', category: 'Admin Panel', icon: 'fa-check-double', action: () => handleAdminNav('commissions') },
        { id: 'admin_withdrawals', title: 'Admin: Process Payout requests', category: 'Admin Panel', icon: 'fa-money-bill-wave', action: () => handleAdminNav('withdrawals') },
        
        // Actions
        { id: 'act_copy_link', title: 'Copy Referral Link', category: 'Actions', icon: 'fa-copy', action: () => triggerGlobalAction('copyReferralLink') },
        { id: 'act_download_qr', title: 'Download Referral QR Code', category: 'Actions', icon: 'fa-qrcode', action: () => triggerGlobalAction('downloadQRCode') },
        { id: 'act_download_report', title: 'Download Performance Certificate', category: 'Actions', icon: 'fa-file-pdf', action: () => triggerGlobalAction('downloadPerformancePDF') },
        
        // Theme
        { id: 'theme_dark', title: 'Toggle Dark / Light Theme Mode', category: 'Preferences', icon: 'fa-adjust', action: () => { if (window.toggleDarkMode) window.toggleDarkMode(); } }
    ];

    let backdrop = null;
    let input = null;
    let resultsContainer = null;
    let currentResults = [];
    let activeIndex = 0;
    let triggerElement = null;

    // Helper: Execute tab switch inside user dashboard
    function handleTabNav(tabId) {
        if (window.switchTab) {
            window.switchTab(tabId);
            closePalette();
            showToast(`Navigated to ${tabId}`, 'info', 2000);
        } else {
            showToast('Navigation only supported on Affiliate Dashboard.', 'warning');
        }
    }

    // Helper: Execute tab switch inside admin dashboard
    function handleAdminNav(tabId) {
        if (window.switchAdminTab) {
            window.switchAdminTab(tabId);
            closePalette();
            showToast(`Navigated to Admin ${tabId}`, 'info', 2000);
        } else {
            showToast('Navigation only supported on Admin Console.', 'warning');
        }
    }

    // Helper: trigger action callbacks
    function triggerGlobalAction(fnName) {
        if (window[fnName]) {
            closePalette();
            window[fnName]();
        } else {
            showToast('Action is not available on this page.', 'warning');
        }
    }

    // Initialize command palette markup once page is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Inject layout backdrop markup dynamically to minimize HTML edit footprint
        const container = document.createElement('div');
        container.className = 'command-palette-backdrop';
        container.id = 'command-palette-backdrop';
        container.innerHTML = `
            <div class="command-palette" role="dialog" aria-modal="true" aria-label="System command center">
                <div class="command-palette-search-wrapper">
                    <i class="fas fa-search command-palette-search-icon"></i>
                    <input type="text" class="command-palette-input" id="command-palette-input" placeholder="Type a command or search..." autocomplete="off" spellcheck="false">
                    <span class="command-palette-shortcut-badge">ESC</span>
                </div>
                <div class="command-palette-results" id="command-palette-results"></div>
            </div>
        `;
        document.body.appendChild(container);

        backdrop = document.getElementById('command-palette-backdrop');
        input = document.getElementById('command-palette-input');
        resultsContainer = document.getElementById('command-palette-results');

        // Close when clicking outside modal box
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePalette();
        });

        // Key and input listeners
        input.addEventListener('input', handleSearch);
        input.addEventListener('keydown', handleKeyNavigation);

        // Global keybind: Ctrl+K / Cmd+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                togglePalette();
            }
        });
    });

    function togglePalette() {
        if (backdrop.classList.contains('show')) {
            closePalette();
        } else {
            openPalette();
        }
    }

    function openPalette() {
        triggerElement = document.activeElement;
        backdrop.classList.add('show');
        input.value = '';
        renderResults(registry);
        // Delay focus slightly to guarantee clean layout update
        setTimeout(() => input.focus(), 50);
    }

    function closePalette() {
        backdrop.classList.remove('show');
        if (triggerElement) triggerElement.focus();
    }

    function handleSearch() {
        const query = input.value.trim().toLowerCase();
        if (!query) {
            renderResults(registry);
            return;
        }

        // Fuzzy filter match titles/categories
        const filtered = registry.filter(item => 
            item.title.toLowerCase().includes(query) || 
            item.category.toLowerCase().includes(query)
        );

        renderResults(filtered);
    }

    function renderResults(list) {
        // Filter elements based on page compatibility (don't display admin options on affiliate page, and vice-versa)
        const isUserDashboard = !!window.switchTab;
        const isAdminDashboard = !!window.switchAdminTab;

        currentResults = list.filter(item => {
            if (item.category === 'Admin Panel' && !isAdminDashboard) return false;
            if (item.category === 'Navigation' && !isUserDashboard) return false;
            return true;
        });

        resultsContainer.innerHTML = '';
        activeIndex = 0;

        if (currentResults.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 2rem 1.5rem; text-align: center; color: var(--aff-text-muted); font-size: 0.9rem;">
                    No commands matched. Try searching for "theme" or "dashboard"
                </div>
            `;
            return;
        }

        let currentCategory = '';
        currentResults.forEach((item, index) => {
            if (item.category !== currentCategory) {
                currentCategory = item.category;
                const header = document.createElement('div');
                header.className = 'command-palette-result-group';
                header.textContent = currentCategory;
                resultsContainer.appendChild(header);
            }

            const el = document.createElement('div');
            el.className = `command-palette-item ${index === 0 ? 'active' : ''}`;
            el.id = `cmd-item-${index}`;
            el.setAttribute('role', 'option');
            el.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            
            el.innerHTML = `
                <div class="command-palette-item-content">
                    <i class="fas ${item.icon} command-palette-item-icon"></i>
                    <span>${item.title}</span>
                </div>
                <span class="command-palette-item-shortcut">Enter</span>
            `;

            el.addEventListener('click', () => executeResult(index));
            resultsContainer.appendChild(el);
        });
    }

    function handleKeyNavigation(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateActiveIndex((activeIndex + 1) % currentResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateActiveIndex((activeIndex - 1 + currentResults.length) % currentResults.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentResults[activeIndex]) {
                executeResult(activeIndex);
            }
        }
    }

    function updateActiveIndex(newIndex) {
        if (currentResults.length === 0) return;
        
        // Remove active class from previous item
        const prevActive = resultsContainer.querySelector('.command-palette-item.active');
        if (prevActive) {
            prevActive.classList.remove('active');
            prevActive.setAttribute('aria-selected', 'false');
        }

        activeIndex = newIndex;
        
        // Add active class to new item
        const newActive = document.getElementById(`cmd-item-${activeIndex}`);
        if (newActive) {
            newActive.classList.add('active');
            newActive.setAttribute('aria-selected', 'true');
            
            // Scroll item into viewport container smoothly
            newActive.scrollIntoView({ block: 'nearest' });
        }
    }

    function executeResult(index) {
        const item = currentResults[index];
        if (item && item.action) {
            item.action();
        }
    }
})();
