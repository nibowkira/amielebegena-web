/**
 * Amiele Begena - Affiliate Dashboard JS Controller
 * Premium SaaS UI interactions, canvas charts, QR codes, and PDF generation.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const esc = window.AmieleSanitize ? window.AmieleSanitize.escapeHtml : function(v) { return v == null ? '' : String(v); };

    // 1. Route guard check
    const user = await window.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html?redirect=affiliate-dashboard.html';
        return;
    }

    if (user.role !== 'affiliate' && user.role !== 'admin') {
        // Check if application is pending
        let app = null;
        if (window.AffiliateService) {
            try {
                app = await window.AffiliateService.getUserApplication(user.id);
            } catch (e) {
                console.error('[Amiele:Auth] Error fetching app review state:', e);
            }
        }
        if (app && app.status === 'pending') {
            document.body.innerHTML = `
                <div style="padding:4rem 2rem; text-align:center; font-family:'Outfit',sans-serif; background:#f9f8f4; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div style="font-size:3rem; margin-bottom:1rem; animation: pulse 2s infinite;">🎻</div>
                    <h2 style="color:#14231b; font-family:Georgia,serif; font-size:1.8rem; margin-bottom:0.5rem;">Your application is under review</h2>
                    <p style="color:#555; max-width:420px; margin:0.5rem auto 2.5rem; line-height:1.6; font-size:0.95rem;">
                        Our curation team is currently reviewing your partnership request. We will notify you as soon as your account is approved.
                    </p>
                    <a href="account.html" class="aff-btn" style="text-decoration:none; display:inline-block; padding:0.8rem 1.6rem; background:#14231b; color:white; border-radius:8px; font-weight:600; transition: background 0.2s;">Back to Account</a>
                </div>
            `;
            return;
        }
        window.location.href = 'login.html?redirect=affiliate-dashboard.html';
        return;
    }

    // Wait for DB cache initialization
    if (window.AmieleDB && window.AmieleDB.ready) {
        await window.AmieleDB.ready;
    }

    // Auto-clear legacy local storage test records to ensure a fresh zero state
    if (window.AmieleDB && typeof window.AmieleDB.resetAffiliateData === 'function') {
        window.AmieleDB.resetAffiliateData();
    }

    // Initialize sidebar user details
    function syncSidebarInfo() {
        document.getElementById('sidebar-user-name').textContent = user.name;
        document.getElementById('sidebar-user-email').textContent = user.email;
        document.getElementById('avatar-letter').textContent = user.name.charAt(0).toUpperCase();
    }
    syncSidebarInfo();

    window.handleLogout = async function(e) {
        if (e) e.preventDefault();
        try {
            if (window.AuthService && typeof window.AuthService.signOut === 'function') {
                await window.AuthService.signOut();
            } else if (window.AmieleDB && typeof window.AmieleDB.logout === 'function') {
                window.AmieleDB.logout();
            } else {
                localStorage.removeItem('amiele_current_user');
            }
            if (typeof showToast === 'function') {
                showToast('Logged out successfully. / በሰላም ወጥተዋል።', 'success');
            }
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 800);
        } catch (err) {
            console.error('[Amiele:Logout] Error:', err);
            window.location.href = 'login.html';
        }
    };

    // Mobile Sidebar Drawer Controller
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.aff-sidebar');
    let sidebarOverlay = document.querySelector('.aff-sidebar-overlay');
    if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'aff-sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
    }

    function toggleMobileSidebar(open) {
        const isOpen = open !== undefined ? open : !sidebar.classList.contains('mobile-open');
        if (isOpen) {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
            document.body.classList.add('sidebar-open');
        } else {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    }

    if (hamburgerBtn && sidebar) {
        hamburgerBtn.onclick = (e) => {
            e.stopPropagation();
            toggleMobileSidebar();
        };
    }

    if (sidebarOverlay) {
        sidebarOverlay.onclick = () => toggleMobileSidebar(false);
    }

    document.querySelectorAll('.aff-sidebar-menu .aff-menu-item, .aff-sidebar a').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                toggleMobileSidebar(false);
            }
        });
    });

    // 2. Fetch Affiliate Metadata from Supabase (with localStorage fallback)
    let metadata = null;
    if (window.AffiliateService) {
        try {
            metadata = await window.AffiliateService.getAffiliateMetadata(user.id);
        } catch (e) {
            console.warn('[Amiele:Affiliate] Supabase metadata fetch failed, using fallback:', e);
        }
    }
    if (!metadata && window.AmieleDB) {
        metadata = AmieleDB.getAffiliateMetadata(user.id);
    }
    if (!metadata) {
        console.error('[Amiele:Affiliate] No affiliate metadata found for user.');
        // Show error state instead of infinite reload loop
        document.body.innerHTML = '<div style="padding:3rem;text-align:center;font-family:sans-serif"><h2>Affiliate data not found</h2><p>Your affiliate account may not be fully provisioned yet.</p><a href="account.html" style="color:#2e7d32">Back to Account</a></div>';
        return;
    }

    // Helper to refresh metadata and update UI stats
    async function refreshDashboardData() {
        if (window.AffiliateService) {
            try {
                const refreshed = await window.AffiliateService.getAffiliateMetadata(user.id);
                if (refreshed) metadata = refreshed;
            } catch (e) {
                console.warn('[Amiele:Affiliate] Metadata refresh failed:', e);
            }
        }
        if (!metadata && window.AmieleDB) {
            metadata = AmieleDB.getAffiliateMetadata(user.id);
        }

        if (metadata) {
            // Ensure zero default state when no real records exist
            metadata.balance = metadata.balance || 0;
            metadata.totalEarnings = metadata.totalEarnings || 0;
            metadata.pendingCommission = metadata.pendingCommission || 0;
            metadata.totalPaid = metadata.totalPaid || 0;
            metadata.sales = metadata.sales || 0;
            metadata.clicks = metadata.clicks || 0;
            metadata.totalOrders = metadata.totalOrders || 0;
        }

        if (metadata) {
            renderStatsCards();
            renderCommissionsTable();
            renderCommissionsTableFull();
            drawOverviewCharts();
        }
    }

    // Interactive button handler to instantly add an approved referral sale and update stats
    window.addSimulatedCommission = async function() {
        try {
            const commissions = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
            const nextOrderNum = '#HA-' + Math.floor(1000 + Math.random() * 9000);
            const newComm = {
                id: 'comm_sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                affiliateId: user.id,
                orderId: nextOrderNum,
                productName: 'Ethiopian Begena Instrument (Handcrafted)',
                orderAmount: 12000,
                commissionAmount: 1200,
                status: 'approved',
                createdAt: new Date().toISOString(),
                approvedAt: new Date().toISOString()
            };
            commissions.push(newComm);
            localStorage.setItem('amiele_commissions', JSON.stringify(commissions));

            if (window.AmieleDB) {
                const affiliates = window.AmieleDB.getAffiliates();
                const aff = affiliates.find(a => a.userId === user.id);
                if (aff) {
                    aff.sales = (aff.sales || 0) + 1;
                    aff.totalEarnings = (aff.totalEarnings || 0) + 1200;
                    aff.balance = (aff.balance || 0) + 1200;
                    window.AmieleDB.saveAffiliates(affiliates);
                }
            }

            if (window.showToast) {
                showToast(`New Approved Order (${nextOrderNum}) Credited! +ETB 1,200`, 'success');
            }
            await refreshDashboardData();
        } catch (e) {
            console.error('[Amiele:Affiliate] Error adding test commission:', e);
        }
    };

    // Perform initial render of overview tab content immediately on startup
    renderStatsCards();
    renderCommissionsTable();
    drawOverviewCharts();

    // Auto-refresh metrics when tab receives focus or local storage updates from admin panel
    window.addEventListener('focus', () => { refreshDashboardData(); });
    window.addEventListener('storage', () => { refreshDashboardData(); });
    window.addEventListener('amiele-commission-updated', () => { refreshDashboardData(); });


    // 3. Notification Hub Operations
    window.toggleNotifDropdown = function(e) {
        if (e) e.stopPropagation();
        const dd = document.getElementById('notif-dropdown');
        if (dd) dd.classList.toggle('show');
    };

    // Close dropdown on clicking outside
    document.addEventListener('click', () => {
        const dd = document.getElementById('notif-dropdown');
        if (dd) dd.classList.remove('show');
    });
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.addEventListener('click', (e) => e.stopPropagation());

    function updateNotificationsBadge() {
        const list = AmieleDB.getNotifications(user.id);
        const unreadCount = list.filter(n => n.unread).length;
        const badge = document.getElementById('notif-badge-count');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    window.markAllNotificationsAsRead = function(e) {
        if (e) e.stopPropagation();
        AmieleDB.markNotificationsAsRead(user.id);
        updateNotificationsBadge();
        renderNotificationsList();
        showToast('All notifications marked as read. / ሁሉም ማሳወቂያዎች ተነበዋል ተብለዋል።', 'info');
    };

    function renderNotificationsList() {
        const container = document.getElementById('notif-list-container');
        if (!container) return;
        
        const list = AmieleDB.getNotifications(user.id);
        container.innerHTML = '';
        
        if (list.length === 0) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--aff-text-muted); font-size: 0.88rem;">
                    No notifications yet. / ምንም አዲስ ማሳወቂያ የለም።
                </div>
            `;
            return;
        }
        
        list.forEach(n => {
            const item = document.createElement('div');
            item.className = `notif-item ${n.unread ? 'unread' : ''}`;
            
            let icon = 'fa-bell';
            if (n.type === 'commission') icon = 'fa-wallet';
            if (n.type === 'payout') icon = 'fa-hand-holding-usd';
            if (n.type === 'campaign') icon = 'fa-trophy';
            if (n.type === 'announcement') icon = 'fa-bullhorn';
            
            const date = new Date(n.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' • ' + new Date(n.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            item.innerHTML = `
                <div class="notif-icon-circle ${esc(n.type)}">
                    <i class="fas ${esc(icon)}"></i>
                </div>
                <div class="notif-item-body">
                    <div class="notif-item-title">${esc(n.title)}</div>
                    <div class="notif-item-text">${esc(n.text)}</div>
                    <div class="notif-item-time">${date}</div>
                </div>
            `;
            
            // Mark individual item read on click
            item.addEventListener('click', () => {
                n.unread = false;
                // Save list back to db
                const notifKey = 'amiele_notifications_' + user.id;
                localStorage.setItem(notifKey, JSON.stringify(list));
                updateNotificationsBadge();
                renderNotificationsList();
            });
            
            container.appendChild(item);
        });
    }

    // Initialize notification badge and list
    updateNotificationsBadge();
    renderNotificationsList();

    // 4. Tab Navigation Logic with Skeleton Shimmer Simulation
    window.switchTab = function(tabName) {
        // Update menu active class
        document.querySelectorAll('.aff-menu-item').forEach(item => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        });
        const activeMenuItem = document.querySelector(`.aff-menu-item[onclick*="${tabName}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
            activeMenuItem.setAttribute('aria-selected', 'true');
        }

        // Update Breadcrumbs
        const breadcrumb = document.getElementById('breadcrumb-current');
        if (breadcrumb) {
            const formattedName = tabName.charAt(0).toUpperCase() + tabName.slice(1);
            breadcrumb.textContent = formattedName === 'Withdrawals' ? 'Payouts' : formattedName;
        }

        // Toggle visibility of panels
        document.querySelectorAll('.aff-tab-pane').forEach(pane => {
            pane.classList.remove('active');
            pane.setAttribute('aria-hidden', 'true');
        });
        const activePane = document.getElementById(`tab-${tabName}`);
        if (activePane) {
            activePane.classList.add('active');
            activePane.setAttribute('aria-hidden', 'false');
        }

        // SKELETON PLACEHOLDER LOADING SIMULATION
        // Trigger skeletons on tabs with grids/charts/tables
        const loadableTabs = ['overview', 'commissions', 'withdrawals', 'campaigns', 'announcements', 'settings'];
        if (loadableTabs.includes(tabName)) {
            triggerTabSkeleton(tabName);
        } else {
            // Draw tab-specific dynamic content immediately
            if (tabName === 'referral') {
                generateReferralQR();
            } else if (tabName === 'performance') {
                renderPerformanceReport();
            }
        }
    };

    function triggerTabSkeleton(tabName) {
        const pane = document.getElementById(`tab-${tabName}`);
        if (!pane) return;

        // Backup original markup if not backed up yet
        if (!pane.dataset.originalMarkup) {
            pane.dataset.originalMarkup = pane.innerHTML;
        }

        // Render skeleton template based on tab structure
        let skeletonHtml = '';
        if (tabName === 'overview') {
            skeletonHtml = `
                <div class="aff-topbar-actions" style="margin-bottom:2rem;">
                    <div class="skeleton-title shimmer-bg"></div>
                </div>
                <div class="aff-stats-grid">
                    ${Array(7).fill('<div class="skeleton-card shimmer-bg"></div>').join('')}
                </div>
                <div class="skeleton-chart shimmer-bg" style="margin-top:2rem;"></div>
            `;
        } else if (tabName === 'commissions' || tabName === 'withdrawals') {
            skeletonHtml = `
                <div class="skeleton-title shimmer-bg"></div>
                <div class="skeleton-chart shimmer-bg" style="height:320px; border-radius:12px;"></div>
            `;
        } else if (tabName === 'campaigns' || tabName === 'announcements') {
            skeletonHtml = `
                <div class="skeleton-title shimmer-bg"></div>
                <div style="display:flex; flex-direction:column; gap:1.5rem; margin-top:2rem;">
                    <div class="skeleton-card shimmer-bg" style="height:120px;"></div>
                    <div class="skeleton-card shimmer-bg" style="height:120px;"></div>
                </div>
            `;
        } else if (tabName === 'settings') {
            skeletonHtml = `
                <div class="skeleton-title shimmer-bg"></div>
                <div class="settings-grid" style="margin-top:2rem;">
                    <div class="skeleton-chart shimmer-bg" style="height:450px;"></div>
                    <div style="display:flex; flex-direction:column; gap:2rem;">
                        <div class="skeleton-card shimmer-bg" style="height:250px;"></div>
                        <div class="skeleton-card shimmer-bg" style="height:150px;"></div>
                    </div>
                </div>
            `;
        }

        pane.innerHTML = skeletonHtml;

        // Wait 650ms to simulate dynamic network load, then restore and render
        setTimeout(() => {
            pane.innerHTML = pane.dataset.originalMarkup;
            
            // Re-render contents
            if (tabName === 'overview') {
                renderStatsCards();
                renderCommissionsTable();
                drawOverviewCharts();
            } else if (tabName === 'commissions') {
                renderCommissionsTableFull();
            } else if (tabName === 'withdrawals') {
                renderWithdrawalHistoryTable();
                initWithdrawalFormHandler();
                // Ensure balances carry over
                const balanceVal = document.getElementById('wth-avail-balance');
                if (balanceVal) balanceVal.textContent = `ETB ${metadata.balance.toLocaleString()}`;
            } else if (tabName === 'campaigns') {
                renderCampaigns();
            } else if (tabName === 'announcements') {
                renderAnnouncements();
            } else if (tabName === 'settings') {
                initSettingsTab();
            }
        }, 600);
    }

    // 4. Render Stats Cards
    function renderStatsCards() {
        if (!metadata) return;

        console.log("=== AFFILIATE DASHBOARD METRICS AUDIT ===");
        console.log("1. Total Clicks:", metadata.clicks);
        console.log("2. Total Referrals:", metadata.totalOrders || 0);
        console.log("3. All Orders:", metadata.totalOrders || 0);
        console.log("4. Gross Volume:", metadata.grossVolume || 0);
        console.log("5. Paid Orders:", metadata.sales);
        console.log("6. Clicks Today:", metadata.clicksToday || 0);
        console.log("7. Clicks This Week:", metadata.clicksWeek || 0);
        console.log("8. Clicks This Month:", metadata.clicksMonth || 0);
        console.log("9. Clicks This Year:", metadata.clicksYear || 0);
        console.log("10. Total Earnings:", metadata.totalEarnings);
        console.log("11. Available Balance:", metadata.balance);
        console.log("=========================================");

        const balEl = document.getElementById('stat-balance');
        if (balEl) balEl.textContent = `ETB ${metadata.balance.toLocaleString()}`;

        const earnEl = document.getElementById('stat-earnings');
        if (earnEl) earnEl.textContent = `ETB ${metadata.totalEarnings.toLocaleString()}`;

        const pendEl = document.getElementById('stat-pending');
        if (pendEl) pendEl.textContent = `ETB ${metadata.pendingCommission.toLocaleString()}`;

        const paidEl = document.getElementById('stat-paid');
        if (paidEl) paidEl.textContent = `ETB ${metadata.totalPaid.toLocaleString()}`;

        const clicksEl = document.getElementById('stat-clicks');
        if (clicksEl) clicksEl.textContent = metadata.clicks;

        const ordersEl = document.getElementById('stat-orders');
        if (ordersEl) ordersEl.textContent = metadata.totalOrders || metadata.sales || 0;

        const salesEl = document.getElementById('stat-sales');
        if (salesEl) salesEl.textContent = metadata.sales;
        
        const rate = metadata.clicks > 0 ? ((metadata.sales / metadata.clicks) * 100).toFixed(1) : '0.0';
        const convEl = document.getElementById('stat-conversion');
        if (convEl) convEl.textContent = `${rate}%`;

        // Advanced Analytics Funnel & Stats
        const funnelClicks = document.getElementById('funnel-clicks');
        if (funnelClicks) {
            funnelClicks.textContent = metadata.clicks;
            const funUniq = document.getElementById('funnel-unique');
            if (funUniq) funUniq.textContent = metadata.uniqueClicks || 0;
            const funOrd = document.getElementById('funnel-orders');
            if (funOrd) funOrd.textContent = metadata.totalOrders || metadata.sales || 0;
            const funPaid = document.getElementById('funnel-paid-orders');
            if (funPaid) funPaid.textContent = metadata.sales;
            const funConv = document.getElementById('funnel-conv');
            if (funConv) funConv.textContent = `${rate}%`;
            const funComm = document.getElementById('funnel-comm');
            if (funComm) funComm.textContent = `ETB ${metadata.totalEarnings.toLocaleString()}`;

            const clkToday = document.getElementById('stat-clicks-today');
            if (clkToday) clkToday.textContent = metadata.clicksToday || 0;
            const clkWk = document.getElementById('stat-clicks-week');
            if (clkWk) clkWk.textContent = metadata.clicksWeek || 0;
            const clkMo = document.getElementById('stat-clicks-month');
            if (clkMo) clkMo.textContent = metadata.clicksMonth || 0;
            const clkYr = document.getElementById('stat-clicks-year');
            if (clkYr) clkYr.textContent = metadata.clicksYear || 0;
        }
    }

    // 5. Draw Canvas Charts (No external dependencies for performance & lightness)
    async function drawOverviewCharts() {
        const canvas = document.getElementById('earningsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let data = [0, 0, 0, 0, 0, metadata.totalEarnings];
        if (window.AffiliateService) {
            try {
                data = await window.AffiliateService.getEarningsChartData(user.id, metadata.totalEarnings);
            } catch (e) {
                console.error('[Amiele:Chart] Error resolving earnings chart:', e);
            }
        }
        
        // Calculate dynamic labels for the past 6 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const labels = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(monthNames[d.getMonth()]);
        }
        
        const maxVal = Math.max(...data, 100) * 1.2;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartHeight = height - padding * 2;
        const chartWidth = width - padding * 2;
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(20, 35, 27, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            // Draw scale numbers
            ctx.fillStyle = '#666';
            ctx.font = '10px Outfit';
            const val = maxVal - (maxVal / 4) * i;
            ctx.fillText(Math.round(val), 5, y + 4);
        }
        
        // Draw line chart & bars
        ctx.fillStyle = 'rgba(20, 35, 27, 0.05)';
        ctx.strokeStyle = '#14231b';
        ctx.lineWidth = 3;
        
        const barWidth = chartWidth / data.length;
        
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = padding + barWidth * i + barWidth / 2;
            const y = padding + chartHeight - (val / maxVal) * chartHeight;
            
            // Draw points
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#14231b';
        ctx.font = '11px Outfit';
        data.forEach((val, i) => {
            const x = padding + barWidth * i + barWidth / 2;
            const y = padding + chartHeight - (val / maxVal) * chartHeight;
            
            // Point circles
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();
            ctx.stroke();
            
            // Text Label month
            ctx.fillStyle = '#555';
            ctx.fillText(labels[i], x - 10, height - 15);
        });
    }

    // 6. Referral center link & QR code drawing
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168.');
    const referralOrigin = isLocalhost ? 'https://amielestore-web.vercel.app' : window.location.origin;
    const referralLink = `${referralOrigin}/index.html?ref=${metadata.code}`;
    const referralLinkInput = document.getElementById('referral-link');
    if (referralLinkInput) {
        referralLinkInput.value = referralLink;
    }
    const couponCodeDisplay = document.getElementById('coupon-code-display');
    if (couponCodeDisplay) {
        couponCodeDisplay.textContent = metadata.couponCode;
    }

    window.copyReferralLink = function() {
        if (referralLinkInput) {
            referralLinkInput.select();
            document.execCommand('copy');
            showToast('Referral link copied to clipboard! / የማጣቀሻ ሊንኩ ተገልብጧል!', 'success');
        }
    };

    window.shareWhatsApp = function() {
        const text = `Buy authentic handcrafted Ethiopian musical instruments (Begena, Krar) from Amiele Begena! Use my referral link: ${referralLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        showToast('WhatsApp sharing window launched. / የዋትስአፕ ማጋሪያ ተከፍቷል።', 'info');
    };

    window.shareTelegram = function() {
        const text = `Buy authentic handcrafted Ethiopian musical instruments (Begena, Krar) from Amiele Begena! Use my referral link: ${referralLink}`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`, '_blank');
        showToast('Telegram sharing window launched. / የቴሌግራም ማጋሪያ ተከፍቷል።', 'info');
    };

    // Draw real scannable QR code using QRious or API fallback
    function generateReferralQR() {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        
        function drawCenterLogo(ctx) {
            const centerSize = 40;
            const centerPos = (canvas.width - centerSize) / 2;
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(centerPos, centerPos, centerSize, centerSize);
            
            ctx.fillStyle = '#14231b';
            ctx.font = 'bold 12px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AM', canvas.width / 2, canvas.height / 2);
        }

        if (typeof QRious !== 'undefined') {
            try {
                new QRious({
                    element: canvas,
                    value: referralLink,
                    size: canvas.width || 240,
                    background: '#ffffff',
                    foreground: '#14231b',
                    level: 'H'
                });
                const ctx = canvas.getContext('2d');
                drawCenterLogo(ctx);
                return;
            } catch (e) {
                console.warn('[Amiele:QR] QRious generation failed, falling back to API:', e);
            }
        }

        // High-reliability API fallback to ensure QR code renders on all environments
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawCenterLogo(ctx);
        };
        img.onerror = function() {
            // Secondary fallback API
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'Anonymous';
            fallbackImg.onload = function() {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(fallbackImg, 0, 0, canvas.width, canvas.height);
                drawCenterLogo(ctx);
            };
            fallbackImg.src = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(referralLink)}`;
        };
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;
    }

    window.downloadQRCode = function() {
        const canvas = document.getElementById('qrCanvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `amiele_qr_${metadata.code}.png`;
        link.href = canvas.toDataURL();
        link.click();
        showToast('QR Code graphics download started. / የQR ኮድ ምስል መጫን ጀምሯል።', 'success');
    };

    // 7. Render tables (Commissions and Withdrawals)
    async function renderCommissionsTable() {
        const tbody = document.getElementById('commissions-table-body');
        if (!tbody) return;

        let commissions = [];
        if (window.AffiliateService) {
            try { commissions = await window.AffiliateService.getCommissionsLedger(user.id); } catch(e) { console.warn(e); }
        }
        if (commissions.length === 0 && window.AmieleDB) {
            commissions = AmieleDB.getAffiliateCommissions(user.id);
        }
        tbody.innerHTML = '';
        
        if (commissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:0;"><div id="empty-overview-commissions"></div></td></tr>';
            renderEmptyState('empty-overview-commissions', 'No commissions tracked yet', 'Share your referral code to begin earning rewards.');
            return;
        }

        commissions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).forEach(c => {
            const date = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${esc(c.orderId)}</strong></td>
                <td>${esc(c.productName)}</td>
                <td>ETB ${c.orderAmount.toLocaleString()}</td>
                <td style="color:var(--aff-primary); font-weight:600;">ETB ${c.commissionAmount.toLocaleString()}</td>
                <td><span class="aff-badge ${esc(c.status)}">${esc(c.status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    async function renderCommissionsTableFull() {
        const tbody = document.getElementById('commissions-table-body-full');
        if (!tbody) return;

        let commissions = [];
        if (window.AffiliateService) {
            try { commissions = await window.AffiliateService.getCommissionsLedger(user.id); } catch(e) { console.warn(e); }
        }
        if (commissions.length === 0 && window.AmieleDB) {
            commissions = AmieleDB.getAffiliateCommissions(user.id);
        }
        tbody.innerHTML = '';
        
        if (commissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:0;"><div id="empty-full-commissions"></div></td></tr>';
            renderEmptyState('empty-full-commissions', 'Ledger is currently empty', 'Your completed referral sales commissions will be logged here.');
            return;
        }

        commissions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(c => {
            const date = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${esc(c.orderId)}</strong></td>
                <td>${esc(c.productName)}</td>
                <td>ETB ${c.orderAmount.toLocaleString()}</td>
                <td style="color:var(--aff-primary); font-weight:600;">ETB ${c.commissionAmount.toLocaleString()}</td>
                <td><span class="aff-badge ${esc(c.status)}">${esc(c.status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    async function renderWithdrawalHistoryTable() {
        const tbody = document.getElementById('withdrawals-table-body');
        if (!tbody) return;

        let withdrawals = [];
        if (window.AffiliateService) {
            try {
                withdrawals = await window.AffiliateService.getWithdrawals(user.id);
            } catch (e) {
                console.error('[Amiele:Withdrawals] Error loading withdrawals history:', e);
            }
        }
        tbody.innerHTML = '';

        if (withdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:0;"><div id="empty-withdrawals"></div></td></tr>';
            renderEmptyState('empty-withdrawals', 'No withdrawals requested', 'Submit a withdrawal request using the balance request form.');
            return;
        }

        withdrawals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => {
            const date = new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td><strong>${esc(w.id)}</strong></td>
                <td style="font-weight:600;">ETB ${w.amount.toLocaleString()}</td>
                <td>${esc(w.method)}</td>
                <td><span class="aff-badge ${esc(w.status)}">${esc(w.status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    // 8. Submit Withdrawal Request (with Modal and WhatsApp automation)
    function initWithdrawalFormHandler() {
        const withdrawalForm = document.getElementById('withdrawal-form');
        if (!withdrawalForm) return;

        withdrawalForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = parseFloat(document.getElementById('wth-amount').value);
            const method = document.getElementById('wth-method').value;
            const phone = document.getElementById('wth-phone').value.trim();

            const feedback = document.getElementById('wth-feedback');
            if (feedback) feedback.classList.add('hidden');

            if (amount > metadata.balance) {
                showToast('Insufficient balance for this request. / በቂ ሂሳብ የሎትም።', 'error');
                return;
            }

            // Custom validation modal confirmation
            const confirmMsg = `
                You are submitting a payout request for:<br>
                <strong>ETB ${amount.toLocaleString()}</strong> via <strong>${method}</strong>.<br>
                Target phone number: <strong>${phone}</strong>.<br><br>
                Would you like to proceed?
            `;
            const confirmed = await showConfirmModal('Request Withdrawal Payout', confirmMsg, false, 'Confirm Request');
            if (!confirmed) {
                showToast('Withdrawal request cancelled. / ክፍያው ተሰርዟል።', 'warning');
                return;
            }

            const submitBtn = withdrawalForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Request...';

            try {
                if (window.AffiliateService) {
                    await window.AffiliateService.requestWithdrawal(user.id, amount, method, phone);
                } else {
                    AmieleDB.requestWithdrawal(amount, method, phone);
                }
                
                // Track internally as read notification
                if (window.AmieleDB) {
                    AmieleDB.addNotification(
                        user.id, 
                        'Withdrawal Requested', 
                        `Payout of ETB ${amount.toLocaleString()} requested via ${method}. Status: pending.`, 
                        'payout'
                    );
                }
                updateNotificationsBadge();
                renderNotificationsList();

                showToast('Request submitted! Redirecting to WhatsApp...', 'success');

                // Build WhatsApp message
                const msg = `Hello Amiele,\n\nI would like to request my affiliate commission.\n\nAffiliate ID: ${user.id}\nRequested Amount: ETB ${amount.toLocaleString()}\nPayment Method: ${method}\nPhone Number: ${phone}\n\nThank you.`;
                const whatsappUrl = `https://wa.me/251969189470?text=${encodeURIComponent(msg)}`;

                setTimeout(() => {
                    window.open(whatsappUrl, '_blank');
                    withdrawalForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    
                    // Reload data
                    setTimeout(async () => {
                        if (window.AffiliateService) {
                            metadata = await window.AffiliateService.getAffiliateMetadata(user.id);
                        }
                        renderStatsCards();
                        renderWithdrawalHistoryTable();
                        
                        // Update header balance immediately
                        const headerBalance = document.getElementById('wth-avail-balance');
                        if (headerBalance) headerBalance.textContent = `ETB ${metadata.balance.toLocaleString()}`;
                    }, 1000);
                }, 1000);

            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                if (feedback) {
                    feedback.textContent = err.message;
                    feedback.className = 'form-feedback error';
                    feedback.classList.remove('hidden');
                }
                showToast(err.message, 'error');
            }
        });
    }

    // 9. Performance Monthly Report PDF Generator
    function renderPerformanceReport() {
        const rate = metadata.clicks > 0 ? ((metadata.sales / metadata.clicks) * 100).toFixed(1) : '0.0';
        document.getElementById('perf-clicks').textContent = metadata.clicks;
        document.getElementById('perf-sales').textContent = metadata.sales;
        document.getElementById('perf-conversions').textContent = `${rate}%`;
        document.getElementById('perf-commission').textContent = `ETB ${metadata.totalEarnings.toLocaleString()}`;
        document.getElementById('perf-revenue').textContent = `ETB ${(metadata.totalEarnings * 10).toLocaleString()}`;
    }

    window.downloadPerformancePDF = function() {
        // Draw report as high-fidelity visual layout onto a canvas & trigger printing/export
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        // Draw header background
        ctx.fillStyle = '#14231b';
        ctx.fillRect(0, 0, 800, 200);

        // Header branding
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Georgia';
        ctx.fillText('AMIELE BEGENA', 50, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Outfit';
        ctx.fillText('Affiliate Monthly Performance Certificate', 50, 120);
        
        ctx.font = '12px Outfit';
        ctx.fillStyle = '#aebdb4';
        ctx.fillText(`Generated Date: ${new Date().toLocaleDateString()}`, 50, 160);

        // Body Content
        ctx.fillStyle = '#f9f8f4';
        ctx.fillRect(0, 200, 800, 800);

        // Left Info section
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 20px Georgia';
        ctx.fillText('Partner Information', 50, 260);

        ctx.font = '14px Outfit';
        ctx.fillText(`Partner Name: ${user.name}`, 50, 300);
        ctx.fillText(`Affiliate Code: ${metadata.code}`, 50, 330);
        ctx.fillText(`Tier Level: ${metadata.tier.toUpperCase()}`, 50, 360);

        // Right Stats grid
        ctx.fillText('Key Metrics', 450, 260);
        ctx.font = '14px Outfit';
        ctx.fillText(`Total Referrals Clicks: ${metadata.clicks}`, 450, 300);
        ctx.fillText(`Successful Sales: ${metadata.sales}`, 450, 330);
        const rate = metadata.clicks > 0 ? ((metadata.sales / metadata.clicks) * 100).toFixed(1) : '0.0';
        ctx.fillText(`Conversion Rate: ${rate}%`, 450, 360);
        ctx.fillText(`Commission Balance: ETB ${metadata.totalEarnings.toLocaleString()}`, 450, 390);

        // Draw horizontal divider line
        ctx.strokeStyle = '#14231b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 450);
        ctx.lineTo(750, 450);
        ctx.stroke();

        // High Quality stamp layout
        ctx.fillStyle = '#14231b';
        ctx.font = 'bold 24px Georgia';
        ctx.fillText('OFFICIAL CULTURAL PARTNER', 250, 520);
        ctx.font = '14px Outfit';
        ctx.fillStyle = '#555';
        ctx.fillText('Recognized for contribution to the preservation and development of ancient string strings heritage.', 100, 560);

        // Draw golden crest frame
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6;
        ctx.strokeRect(30, 220, 740, 740);

        // Convert canvas image download link
        const imgUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `amiele_report_${new Date().getMonth() + 1}_2026.png`;
        link.href = imgUri;
        link.click();
        showToast('Monthly performance report downloaded successfully. / ሪፖርቱ ወርዷል።', 'success');
    };

    // 10. Achievements / Milestones Milestones
    function renderAchievements() {
        const count = metadata.sales;
        const list = [
            { id: 'first_sale', title: 'First Sale', desc: 'Refer 1 successful sale', threshold: 1, icon: '🌟' },
            { id: '10_sales', title: 'Craftsman Rank', desc: 'Refer 10 successful sales', threshold: 10, icon: '🎻' },
            { id: '50_sales', title: 'Maestro Rank', desc: 'Refer 50 successful sales', threshold: 50, icon: '🎼' },
            { id: '100_sales', title: 'Guardian Elite', desc: 'Refer 100 successful sales', threshold: 100, icon: '👑' },
            { id: 'top_affiliate', title: 'Top Ambassador', desc: 'Ranked in the top 3 ambassadors', threshold: 250, icon: '🎭' }
        ];

        const container = document.getElementById('achievements-container');
        if (!container) return;

        container.innerHTML = '';
        list.forEach(badge => {
            const unlocked = count >= badge.threshold;
            const card = document.createElement('div');
            card.className = `achievement-badge-card ${unlocked ? 'unlocked' : ''}`;
            
            // Cert action link if unlocked
            const certBtn = unlocked ? `<button class="btn-light-green" style="margin-top: 1rem; width:100%;" onclick="downloadCertificate('${badge.title}')">Get Certificate</button>` : '';

            card.innerHTML = `
                <span class="achievement-icon">${badge.icon}</span>
                <h3>${badge.title}</h3>
                <p>${badge.desc}</p>
                <div style="font-size:0.75rem; font-weight:600; margin-top:0.5rem; color:var(--aff-primary);">${count}/${badge.threshold}</div>
                ${certBtn}
            `;
            container.appendChild(card);
        });
    }

    window.downloadCertificate = function(milestoneTitle) {
        const canvas = document.createElement('canvas');
        canvas.width = 1100;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // Draw premium double border
        ctx.fillStyle = '#f9f8f4';
        ctx.fillRect(0, 0, 1100, 800);

        ctx.strokeStyle = '#14231b';
        ctx.lineWidth = 15;
        ctx.strokeRect(30, 30, 1040, 740);

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.strokeRect(55, 55, 990, 690);

        // Draw watermarks or backgrounds
        ctx.fillStyle = 'rgba(20, 35, 27, 0.02)';
        ctx.font = 'bold 150px Georgia';
        ctx.fillText('AMIELE', 280, 480);

        // Core text layout
        ctx.textAlign = 'center';
        ctx.fillStyle = '#14231b';
        
        ctx.font = 'bold 36px Georgia';
        ctx.fillText('CERTIFICATE OF RECOGNITION', 550, 160);

        ctx.font = 'italic 18px Georgia';
        ctx.fillText('This prestigious milestone certificate is proudly presented to', 550, 240);

        ctx.font = 'bold 42px Georgia';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(user.name, 550, 330);
        
        ctx.fillStyle = '#14231b';
        ctx.font = 'italic 18px Georgia';
        ctx.fillText('for successfully reaching the milestone of', 550, 400);

        ctx.font = 'bold 28px Georgia';
        ctx.fillText(`"${milestoneTitle}"`, 550, 460);

        ctx.font = '15px Outfit';
        ctx.fillStyle = '#555';
        ctx.fillText('in recognition of your dedicated partnership, outreach, and impact in sharing Ethiopian musical instruments.', 550, 520);
        ctx.fillText('Your commitment helps sustain traditional artisans and craftsmanship of Addis Ababa.', 550, 545);

        // Signatures line
        ctx.strokeStyle = '#14231b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(400, 660);
        ctx.lineTo(700, 660);
        ctx.stroke();

        ctx.font = 'bold 14px Outfit';
        ctx.fillStyle = '#14231b';
        ctx.fillText('Amiele Begena Curation Team', 550, 680);
        ctx.font = '12px Outfit';
        ctx.fillStyle = '#777';
        ctx.fillText('Authorized Representative', 550, 700);

        // Save as image
        const imgUri = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `amiele_cert_${milestoneTitle.replace(/\s+/g, '_')}.png`;
        link.href = imgUri;
        link.click();
        showToast(`Congratulations on unlocking your ${milestoneTitle} certificate! / የእንኳን ደስ አሎት ምስክር ወረቀት ወርዷል።`, 'success');
    };

    // 11. Campaigns progress calculation
    async function renderCampaigns() {
        let campaigns = [];
        if (window.AffiliateService) {
            try {
                campaigns = await window.AffiliateService.getCampaigns();
            } catch (e) {
                console.error('[Amiele:Campaigns] Error loading active campaigns:', e);
            }
        }
        if (campaigns.length === 0 && window.AmieleDB) {
            campaigns = AmieleDB.getCampaigns();
        }
        const container = document.getElementById('campaigns-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (campaigns.length === 0) {
            container.innerHTML = '<div id="empty-campaigns"></div>';
            renderEmptyState('empty-campaigns', 'No campaigns active', 'Challenges will appear here when active. Check back soon!');
            return;
        }

        const salesCount = metadata.sales;

        campaigns.forEach(c => {
            const current = Math.min(salesCount, c.targetSales);
            const pct = ((current / c.targetSales) * 100).toFixed(0);
            
            const card = document.createElement('div');
            card.className = 'campaign-card';
            card.innerHTML = `
                <div class="campaign-card-header">
                    <h3>${esc(c.title)}</h3>
                    <span class="campaign-reward">+ETB ${c.reward.toLocaleString()} Reward</span>
                </div>
                <p class="campaign-desc">${esc(c.description)}</p>
                <div class="campaign-progress-bar">
                    <div class="campaign-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="campaign-progress-text">
                    <span>Progress: ${current} / ${esc(c.targetSales)} sold (${pct}%)</span>
                    <span>${esc(c.daysRemaining)} days remaining</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 12. Announcements Inside Dashboard
    async function renderAnnouncements() {
        const container = document.getElementById('announcements-container');
        if (!container) return;

        let list = [];
        if (window.AffiliateService) {
            try {
                list = await window.AffiliateService.getAnnouncements();
            } catch (e) {
                console.error('[Amiele:Announcements] Error loading bulletins:', e);
            }
        }
        if (list.length === 0 && window.AmieleDB) {
            list = AmieleDB.getAnnouncements();
        }
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div id="empty-announcements"></div>';
            renderEmptyState('empty-announcements', 'No announcements', 'The announcement bulletin is currently clear.');
            return;
        }

        list.forEach(a => {
            const date = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const item = document.createElement('div');
            item.className = `announcement-item ${a.urgency}`;
            item.innerHTML = `
                <div class="announcement-meta">${date} • ${esc(a.type.toUpperCase())}</div>
                <h3>${esc(a.title)}</h3>
                <p>${esc(a.content)}</p>
            `;
            container.appendChild(item);
        });
    }

    // 13. Settings tab forms logic & profile cards sync
    function initSettingsTab() {
        const setForm = document.getElementById('settings-form');
        if (!setForm) return;

        // Populate fields
        document.getElementById('set-name').value = user.name || '';
        document.getElementById('set-email').value = user.email || '';
        document.getElementById('set-phone').value = user.phone || '';
        document.getElementById('set-country').value = user.country || 'Ethiopia';
        document.getElementById('set-avatar-url').value = user.photoUrl || '';
        
        const prefs = user.notifPreferences || { email: true, push: false };
        document.getElementById('set-pref-email').checked = prefs.email;
        document.getElementById('set-pref-push').checked = prefs.push;

        // Populate Profile Card
        syncProfileCard();

        // Handle settings submit
        setForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('set-name').value.trim();
            const email = document.getElementById('set-email').value.trim();
            const phone = document.getElementById('set-phone').value.trim();
            const country = document.getElementById('set-country').value;
            const photoUrl = document.getElementById('set-avatar-url').value.trim();
            const password = document.getElementById('set-password').value;
            const passConfirm = document.getElementById('set-password-confirm').value;

            if (password && password.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                return;
            }
            if (password && password !== passConfirm) {
                showToast('Passwords do not match. / የይለፍ ቃላት አይዛመዱም።', 'error');
                return;
            }

            const submitBtn = setForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const updateData = {
                name,
                email,
                phone,
                country,
                photoUrl
            };

            if (password) {
                updateData.password = password;
            }

            try {
                if (window.AffiliateService) {
                    await window.AffiliateService.updateProfile(user.id, updateData);
                } else {
                    AmieleDB.updateUserSettings(user.id, updateData);
                }
                
                // Sync session object locally
                user.name = name;
                user.email = email;
                user.phone = phone;
                user.country = country;
                user.photoUrl = photoUrl;
                
                syncSidebarInfo();
                syncProfileCard();
                
                // Clear fields
                document.getElementById('set-password').value = '';
                document.getElementById('set-password-confirm').value = '';
                
                showToast('Configurations saved successfully! / ቅንጅቶችዎ በተሳካ ሁኔታ ተቀምጠዋል።', 'success');
            } catch (err) {
                showToast(err.message || 'Error saving settings.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    function syncProfileCard() {
        const avatarImg = document.getElementById('profile-avatar-img');
        const cardName = document.getElementById('profile-card-name');
        const cardTier = document.getElementById('profile-card-tier');
        const cardId = document.getElementById('profile-card-id');
        const cardJoined = document.getElementById('profile-card-joined');
        const cardEarnings = document.getElementById('profile-card-earnings');
        const cardSales = document.getElementById('profile-card-sales');

        if (!cardName) return;

        cardName.textContent = user.name;
        
        // Avatar rendering
        if (user.photoUrl) {
            avatarImg.innerHTML = '';
            avatarImg.style.backgroundImage = `url('${user.photoUrl}')`;
            avatarImg.style.backgroundSize = 'cover';
            avatarImg.style.backgroundPosition = 'center';
        } else {
            avatarImg.innerHTML = user.name.charAt(0).toUpperCase();
            avatarImg.style.backgroundImage = 'none';
        }

        // Metadata details
        const tierName = metadata.tier.toUpperCase();
        cardTier.textContent = `${tierName} PARTNER`;
        cardTier.className = `profile-tier-badge ${metadata.tier}`;
        
        cardId.textContent = `AFF-${user.id.toUpperCase()}`;
        
        const joinDate = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 10, 2026';
        cardJoined.textContent = `Joined: ${joinDate}`;

        cardEarnings.textContent = `ETB ${metadata.totalEarnings.toLocaleString()}`;
        cardSales.textContent = metadata.sales;

        // Milestone Progress bar
        const progressFill = document.getElementById('tier-progress-fill');
        const progressExpl = document.getElementById('tier-progress-explanation');
        const startText = document.getElementById('tier-progress-start');
        const targetText = document.getElementById('tier-progress-target');

        const currentSales = metadata.sales;
        let startVal = 0, targetVal = 10, fillPct = 0;
        let explanation = '';

        if (currentSales < 10) {
            startVal = 0; targetVal = 10;
            fillPct = (currentSales / 10) * 100;
            explanation = 'Standard to Silver Rank (10 sales required)';
        } else if (currentSales < 50) {
            startVal = 10; targetVal = 50;
            fillPct = ((currentSales - 10) / 40) * 100;
            explanation = 'Silver to Gold Rank (50 sales required)';
        } else {
            startVal = 50; targetVal = 100;
            fillPct = Math.min(((currentSales - 50) / 50) * 100, 100);
            explanation = 'Gold to Maestro elite Rank (100 sales required)';
        }

        progressFill.style.width = `${fillPct}%`;
        progressExpl.textContent = explanation;
        startText.textContent = `${startVal} Sales`;
        targetText.textContent = `${targetVal} Sales`;

        // Profile unlocked badges list
        const badgesContainer = document.getElementById('profile-badges-summary');
        if (badgesContainer) {
            badgesContainer.innerHTML = '';
            const badgesList = [
                { threshold: 1, icon: '🌟', title: 'First Sale' },
                { threshold: 10, icon: '🎻', title: 'Craftsman' },
                { threshold: 50, icon: '🎼', title: 'Maestro' },
                { threshold: 100, icon: '👑', title: 'Guardian' }
            ];

            let unlockedAny = false;
            badgesList.forEach(b => {
                if (currentSales >= b.threshold) {
                    unlockedAny = true;
                    const badgeIcon = document.createElement('span');
                    badgeIcon.style.fontSize = '1.3rem';
                    badgeIcon.style.padding = '4px';
                    badgeIcon.title = b.title;
                    badgeIcon.textContent = b.icon;
                    badgesContainer.appendChild(badgeIcon);
                }
            });

            if (!unlockedAny) {
                badgesContainer.innerHTML = '<span style="font-size:0.78rem; color:var(--aff-text-muted);">No badges unlocked yet.</span>';
            }
        }
    }

    // 14. Network Offline Monitoring
    window.addEventListener('offline', () => {
        const banner = document.getElementById('offline-banner');
        if (banner) banner.classList.add('active');
        showToast('Your browser has disconnected from the internet. Showing cached profile details. / በይነመረብ ተቋርጧል።', 'warning');
    });

    window.addEventListener('online', () => {
        const banner = document.getElementById('offline-banner');
        if (banner) banner.classList.remove('active');
        showToast('You are back online! Connection synced. / በይነመረብ ተመልሷል።', 'success');
    });

    // Initial setup loads
    renderStatsCards();
    renderCommissionsTable();
    renderWithdrawalHistoryTable();
    initWithdrawalFormHandler();
    renderAchievements();
    renderCampaigns();
    renderAnnouncements();
    
    // Draw initial charts
    drawOverviewCharts();

    // 15. Global Accessibility Keyboard shortcuts listener
    document.addEventListener('keydown', (e) => {
        // Prevent shortcuts from firing while editing form inputs
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        // 1-9 Tab Navigation Routing
        const tabRoutes = {
            '1': 'overview',
            '2': 'referral',
            '3': 'commissions',
            '4': 'withdrawals',
            '5': 'performance',
            '6': 'marketing',
            '7': 'campaigns',
            '8': 'achievements',
            '9': 'announcements',
            '0': 'settings'
        };

        if (tabRoutes[e.key]) {
            e.preventDefault();
            window.switchTab(tabRoutes[e.key]);
            return;
        }

        // Toggle Notifications panel shortcut
        if (e.key.toLowerCase() === 'n') {
            e.preventDefault();
            window.toggleNotifDropdown();
            return;
        }

        // Keyboard Shortcut Help overlay dialog
        if (e.key === '?') {
            e.preventDefault();
            const helperHtml = `
                <div style="display:flex; flex-direction:column; gap:0.8rem; font-family:'Outfit',sans-serif; text-align:left;">
                    <p style="margin:0 0 1rem; color:var(--aff-text-muted);">Use these quick keys to browse through components rapidly:</p>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">1</kbd> to <kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">0</kbd></span>
                        <span style="color:var(--aff-text-muted);">Navigate Portal Tabs</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Ctrl + K</kbd></span>
                        <span style="color:var(--aff-text-muted);">Launch Search Command Palette</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">N</kbd></span>
                        <span style="color:var(--aff-text-muted);">Toggle Inbox Alerts Drawer</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Esc</kbd></span>
                        <span style="color:var(--aff-text-muted);">Close Open Panels / Dialogs</span>
                    </div>
                </div>
            `;
            showConfirmModal('Keyboard Shortcut Directory', helperHtml, false, 'Close Helper');
            return;
        }

        // Close dropdowns and active confirm modal backdrops with Escape
        if (e.key === 'Escape') {
            const notifDd = document.getElementById('notif-dropdown');
            if (notifDd) notifDd.classList.remove('show');
            
            const backdrop = document.getElementById('custom-modal-backdrop');
            if (backdrop && backdrop.classList.contains('show')) {
                const cancelBtn = document.getElementById('modal-btn-cancel');
                if (cancelBtn) cancelBtn.click();
            }
        }
    });

    // =========================================================================
    // 16. ONBOARDING TOUR ENGINE
    // =========================================================================
    const TOUR_KEY = 'amiele_tour_completed_' + (user ? user.id : 'anon');

    function initOnboardingTour() {
        if (localStorage.getItem(TOUR_KEY)) return; // already completed

        const steps = [
            { target: '.aff-sidebar-menu', title: 'Navigation Hub', desc: 'Browse your dashboard sections here — earnings, referrals, campaigns, and more.', position: 'right' },
            { target: '.aff-stats-grid', title: 'Your Performance', desc: 'Track your balance, earnings, referrals, and conversion rates at a glance.', position: 'bottom' },
            { target: '#notif-bell-btn', title: 'Stay Notified', desc: 'Real-time alerts about commissions, payouts, and platform announcements.', position: 'bottom' },
            { target: '.command-palette-hint', title: 'Quick Search', desc: 'Press Ctrl+K anytime to search commands, navigate tabs, or toggle themes.', position: 'bottom' },
            { target: '.theme-toggle-btn', title: 'Dark Mode', desc: 'Switch between light and dark themes for comfortable viewing.', position: 'bottom' }
        ];

        let currentStep = 0;

        // Create mask and tooltip elements
        const mask = document.createElement('div');
        mask.className = 'onboarding-spotlight-mask';
        document.body.appendChild(mask);

        const tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip';
        document.body.appendChild(tooltip);

        function showStep(index) {
            const step = steps[index];
            const targetEl = document.querySelector(step.target);
            if (!targetEl) {
                // Skip if target not found
                if (index < steps.length - 1) showStep(index + 1);
                else endTour();
                return;
            }

            // Highlight target with high z-index
            targetEl.style.position = targetEl.style.position || 'relative';
            targetEl.style.zIndex = '10003';
            targetEl.style.outline = '3px solid var(--aff-accent)';
            targetEl.style.outlineOffset = '4px';
            targetEl.style.borderRadius = '12px';

            // Position tooltip near target
            const rect = targetEl.getBoundingClientRect();
            tooltip.innerHTML = `
                <h3>Step ${index + 1} of ${steps.length}: ${step.title}</h3>
                <p>${step.desc}</p>
                <div class="onboarding-tooltip-btns">
                    <button class="onboarding-tooltip-btn" onclick="window._tourSkip()">Skip Tour</button>
                    <button class="onboarding-tooltip-btn primary" onclick="window._tourNext()">${index < steps.length - 1 ? 'Next →' : 'Finish ✓'}</button>
                </div>
            `;

            // Position based on step preference
            if (step.position === 'right') {
                tooltip.style.top = rect.top + 'px';
                tooltip.style.left = (rect.right + 16) + 'px';
            } else {
                tooltip.style.top = (rect.bottom + 16) + 'px';
                tooltip.style.left = Math.max(16, rect.left - 40) + 'px';
            }

            mask.classList.add('active');
            tooltip.classList.add('active');
        }

        function clearHighlights() {
            document.querySelectorAll('[style*="z-index: 10003"]').forEach(el => {
                el.style.zIndex = '';
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
        }

        function endTour() {
            clearHighlights();
            mask.classList.remove('active');
            tooltip.classList.remove('active');
            localStorage.setItem(TOUR_KEY, 'true');
            showToast('Welcome aboard! Explore your dashboard. Press ? for keyboard shortcuts.', 'success');
        }

        window._tourNext = function() {
            clearHighlights();
            currentStep++;
            if (currentStep < steps.length) {
                showStep(currentStep);
            } else {
                endTour();
            }
        };

        window._tourSkip = function() {
            endTour();
        };

        // Start tour after a short delay for page to fully render
        setTimeout(() => showStep(0), 1200);
    }

    initOnboardingTour();

    // =========================================================================
    // 17. PROFILE COMPLETION INDICATOR
    // =========================================================================
    function renderProfileCompletionRing() {
        const userInfo = AmieleDB.getCurrentUser();
        if (!userInfo) return;

        const meta = AmieleDB.getAffiliateMetadata(userInfo.id);
        const fields = [
            !!userInfo.name,
            !!userInfo.email,
            !!(meta && meta.phone),
            !!(meta && meta.country),
            !!(meta && meta.paymentMethod)
        ];
        const completed = fields.filter(Boolean).length;
        const total = fields.length;
        const pct = Math.round((completed / total) * 100);
        const circumference = 2 * Math.PI * 18;
        const offset = circumference - (pct / 100) * circumference;

        const ringEl = document.createElement('div');
        ringEl.style.cssText = 'display:flex; align-items:center; gap:10px; padding:0.8rem 1.2rem; margin-top:0.5rem; cursor:pointer; border-radius:12px; transition:background 0.2s;';
        ringEl.title = 'Click to complete your profile';
        ringEl.addEventListener('mouseenter', () => ringEl.style.background = 'rgba(255,255,255,0.05)');
        ringEl.addEventListener('mouseleave', () => ringEl.style.background = 'transparent');
        ringEl.addEventListener('click', () => window.switchTab('settings'));

        ringEl.innerHTML = `
            <svg width="42" height="42" viewBox="0 0 42 42" style="flex-shrink:0;">
                <circle cx="21" cy="21" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                <circle cx="21" cy="21" r="18" fill="none" stroke="${pct === 100 ? '#ffd700' : '#64b5f6'}" stroke-width="3"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                    stroke-linecap="round" transform="rotate(-90 21 21)"
                    style="transition: stroke-dashoffset 1s ease;"/>
                <text x="21" y="24" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="Outfit,sans-serif">${pct}%</text>
            </svg>
            <span style="font-size:0.75rem; color:rgba(255,255,255,0.6);">${pct === 100 ? 'Profile Complete' : 'Complete Profile'}</span>
        `;

        const sidebar = document.querySelector('.aff-sidebar');
        const userBlock = sidebar.querySelector('.aff-sidebar-user');
        if (userBlock && sidebar) {
            sidebar.insertBefore(ringEl, userBlock);
        }
    }

    renderProfileCompletionRing();
});
