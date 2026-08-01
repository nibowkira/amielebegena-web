document.addEventListener('DOMContentLoaded', async () => {
    const esc = window.AmieleSanitize ? window.AmieleSanitize.escapeHtml : function(v) { return v == null ? '' : String(v); };

    // 1. Guard check
    const user = await window.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Wait for DB cache initialization
    if (window.AmieleDB && window.AmieleDB.ready) {
        await window.AmieleDB.ready;
    }

    // Tab switcher
    window.switchAdminTab = function(tabName) {
        document.querySelectorAll('.aff-menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeMenuItem = document.querySelector(`.aff-menu-item[onclick*="${tabName}"]`);
        if (activeMenuItem) activeMenuItem.classList.add('active');

        document.querySelectorAll('.aff-tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        const activePane = document.getElementById(`tab-${tabName}`);
        if (activePane) activePane.classList.add('active');

        // Dynamic loads
        if (tabName === 'dashboard') renderDashboardStats();
        if (tabName === 'users') renderUsersList();
        if (tabName === 'applications') renderApplicationsQueue();
        if (tabName === 'commissions') renderCommissionsQueue();
        if (tabName === 'withdrawals') renderWithdrawalsQueue();
        if (tabName === 'commission-center') renderCommissionCenter();
        if (tabName === 'campaigns') renderCampaignsList();
        if (tabName === 'announcements') renderAnnouncementsList();
    };

    // Expose globally for HTML button handlers
    window.renderDashboardStats = renderDashboardStats;

    // 2. Dashboard Analytics Overview (100% Live Supabase)
    async function renderDashboardStats() {
        console.log('[Amiele:Admin] Rendering Comprehensive Analytics Dashboard...');
        const updatedEl = document.getElementById('admin-last-updated');
        if (updatedEl) updatedEl.textContent = 'Updating...';

        let analytics = null;
        if (window.AdminService && typeof window.AdminService.getComprehensiveAdminAnalytics === 'function') {
            try {
                analytics = await window.AdminService.getComprehensiveAdminAnalytics();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching analytics:', e);
            }
        }

        if (updatedEl) updatedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();

        if (!analytics) {
            console.warn('[Amiele:Admin] Analytics data unavailable or empty.');
            return;
        }

        const cards = analytics.summaryCards || {};

        // 1. Populate 12 Summary Cards
        const elRev = document.getElementById('card-total-revenue');
        if (elRev) elRev.textContent = `ETB ${(cards.totalRevenue || 0).toLocaleString()}`;

        const elRevMo = document.getElementById('card-revenue-month');
        if (elRevMo) elRevMo.textContent = `ETB ${(cards.revenueThisMonth || 0).toLocaleString()}`;

        const elTotOrd = document.getElementById('card-total-orders');
        if (elTotOrd) elTotOrd.textContent = (cards.totalOrders || 0).toLocaleString();

        const elPendOrd = document.getElementById('card-pending-orders');
        if (elPendOrd) elPendOrd.textContent = (cards.pendingOrders || 0).toLocaleString();

        const elConfOrd = document.getElementById('card-confirmed-orders');
        if (elConfOrd) elConfOrd.textContent = (cards.confirmedOrders || 0).toLocaleString();

        const elShipOrd = document.getElementById('card-shipped-orders');
        if (elShipOrd) elShipOrd.textContent = (cards.shippedOrders || 0).toLocaleString();

        const elDelOrd = document.getElementById('card-delivered-orders');
        if (elDelOrd) elDelOrd.textContent = (cards.deliveredOrders || 0).toLocaleString();

        const elCust = document.getElementById('card-total-customers');
        if (elCust) elCust.textContent = (cards.totalCustomers || 0).toLocaleString();

        const elAff = document.getElementById('card-total-affiliates');
        if (elAff) elAff.textContent = (cards.totalAffiliates || 0).toLocaleString();

        const elTopAff = document.getElementById('card-top-affiliate');
        const elTopAffSub = document.getElementById('card-top-affiliate-sub');
        const elInsightAff = document.getElementById('insight-top-affiliate');
        if (cards.topAffiliate) {
            const affName = cards.topAffiliate.name || 'N/A';
            if (elTopAff) elTopAff.textContent = affName;
            if (elInsightAff) elInsightAff.textContent = affName;
            if (elTopAffSub) elTopAffSub.textContent = `${cards.topAffiliate.salesCount || 0} Sales • ETB ${(cards.topAffiliate.totalEarnings || 0).toLocaleString()}`;
        }

        const elTopProd = document.getElementById('card-top-product');
        const elTopProdSub = document.getElementById('card-top-product-sub');
        const elInsightProd = document.getElementById('insight-best-product');
        if (cards.bestSellingProduct) {
            const prodName = cards.bestSellingProduct.name || 'N/A';
            if (elTopProd) elTopProd.textContent = prodName;
            if (elInsightProd) elInsightProd.textContent = prodName;
            if (elTopProdSub) elTopProdSub.textContent = `${cards.bestSellingProduct.unitsSold || 0} Units Sold`;
        }

        const elAov = document.getElementById('card-aov');
        const elInsightAov = document.getElementById('insight-aov');
        const aovVal = `ETB ${(cards.avgOrderValue || 0).toLocaleString()}`;
        if (elAov) elAov.textContent = aovVal;
        if (elInsightAov) elInsightAov.textContent = aovVal;

        const elInsightRevMo = document.getElementById('insight-revenue-month');
        if (elInsightRevMo) elInsightRevMo.textContent = `ETB ${(cards.revenueThisMonth || 0).toLocaleString()}`;

        // 2. Render Monthly Revenue Chart
        const chartContainer = document.getElementById('chart-monthly-revenue');
        if (chartContainer && analytics.monthlyRevenueData) {
            const data = analytics.monthlyRevenueData;
            const maxRev = Math.max(1, ...data.map(d => d.revenue));

            chartContainer.innerHTML = data.map(d => {
                const heightPct = Math.max(12, Math.round((d.revenue / maxRev) * 100));
                return `
                    <div class="admin-chart-bar-wrap" style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                        <div class="admin-chart-bar" style="width:100%; max-width:28px; height:${heightPct}%; background:linear-gradient(180deg, #D4AF37, #0F2418); border-radius:4px 4px 0 0;" data-tooltip="ETB ${d.revenue.toLocaleString()} (${d.ordersCount} Orders)"></div>
                        <span class="admin-chart-label" style="color:#667085; font-weight:600; font-size:0.75rem; margin-top:8px;">${esc(d.month)}</span>
                    </div>
                `;
            }).join('');
        }

        // 3. Render Orders by Country (Country Analytics with flags & exact percentages)
        const countryContainer = document.getElementById('container-country-orders');
        if (countryContainer && analytics.countryList) {
            const list = analytics.countryList;
            if (list.length === 0) {
                countryContainer.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="globe" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No country data.</div>';
            } else {
                countryContainer.innerHTML = list.slice(0, 4).map(c => `
                    <div class="admin-progress-row" style="margin-bottom:0.85rem;">
                        <div class="admin-progress-header" style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; font-weight:600; margin-bottom:0.3rem; color:#1C1C1C;">
                            <span><span style="font-size:0.95rem; margin-right:6px;">${c.country === 'Ethiopia' ? '🇪🇹' : c.country === 'United States' ? '🇺🇸' : c.country === 'Canada' ? '🇨🇦' : '🌐'}</span> ${esc(c.country)}</span>
                            <span style="color:#0F2418; font-weight:700;">${c.count} <span style="color:#667085; font-weight:500; font-size:0.75rem; margin-left:4px;">${c.percentage}%</span></span>
                        </div>
                        <div class="admin-progress-bg" style="background:#F8F6F1; border:1px solid #E7E3D8; height:6px; border-radius:6px; overflow:hidden;">
                            <div class="admin-progress-fill" style="width:${Math.max(5, c.percentage)}%; background:linear-gradient(90deg, #D4AF37, #0F2418); height:100%; border-radius:6px;"></div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 4. Render Affiliate Leaderboard (Rank badges, initials, sales & earnings)
        const affLeaderboardContainer = document.getElementById('container-affiliate-leaderboard');
        if (affLeaderboardContainer && analytics.affiliateLeaderboard) {
            const list = analytics.affiliateLeaderboard;
            if (list.length === 0) {
                affLeaderboardContainer.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="user-x" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No leaderboard data.</div>';
            } else {
                affLeaderboardContainer.innerHTML = list.slice(0, 5).map((a, idx) => {
                    const badgeBg = idx === 0 ? '#D4AF37' : idx === 1 ? '#94A3B8' : idx === 2 ? '#D97706' : '#1C1C1C';
                    const initials = (a.name || 'AN').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #F1F5F9;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-weight:800; color:#FFFFFF; font-size:0.75rem; background:${badgeBg}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${idx + 1}</span>
                                <div style="width:26px; height:26px; border-radius:50%; background:#0F2418; color:#D4AF37; font-weight:700; font-size:0.72rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${initials}</div>
                                <div>
                                    <div style="font-weight:700; font-size:0.82rem; color:#1C1C1C; line-height:1.2;">${esc(a.name)}</div>
                                    <span style="font-size:0.72rem; color:#667085;">${esc(a.code || 'N/A')}</span>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:700; color:#1C1C1C; font-size:0.8rem;">${a.salesCount} Sales</div>
                                <span style="font-size:0.72rem; color:#667085; font-weight:500;">ETB ${a.totalEarnings.toLocaleString()}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 5. Render Best Selling Products Table
        const prodContainer = document.getElementById('container-top-products');
        if (prodContainer && analytics.topProductsList) {
            const list = analytics.topProductsList;
            if (list.length === 0) {
                prodContainer.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="package-x" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No product sales.</div>';
            } else {
                prodContainer.innerHTML = `
                    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size:0.72rem; font-weight:700; color:#667085; text-transform:uppercase; padding-bottom:6px; border-bottom:1px solid #E7E3D8; margin-bottom:8px;">
                        <span>PRODUCT</span>
                        <span style="text-align:center;">UNITS SOLD</span>
                        <span style="text-align:right;">REVENUE</span>
                        <span style="text-align:right;">TREND</span>
                    </div>
                    ` + list.slice(0, 3).map(p => `
                        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items:center; padding:0.6rem 0; border-bottom:1px solid #F1F5F9;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:34px; height:34px; border-radius:8px; background:rgba(212,175,55,0.12); color:#D4AF37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i data-lucide="music" style="width:16px; height:16px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight:700; font-size:0.84rem; color:#1C1C1C;">${esc(p.name)}</div>
                                    <span style="font-size:0.72rem; color:#667085;">Traditional Instrument</span>
                                </div>
                            </div>
                            <div style="text-align:center; font-weight:700; font-size:0.85rem; color:#1C1C1C;">${p.unitsSold}</div>
                            <div style="text-align:right; font-weight:700; font-size:0.85rem; color:#1C1C1C;">ETB ${p.revenueETB.toLocaleString()}</div>
                            <div style="text-align:right;">
                                <svg width="40" height="20" viewBox="0 0 40 20" fill="none"><path d="M2 16L12 12L22 14L38 4" stroke="#16A34A" stroke-width="2" stroke-linecap="round"/></svg>
                            </div>
                        </div>
                    `).join('');
            }
        }

        // 6. Render Connected Order Workflow Pipeline (Matching exact reference cards)
        const funnelContainer = document.getElementById('container-status-customer-analytics');
        if (funnelContainer) {
            const st = analytics.orderStatusBreakdown || {};

            funnelContainer.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#FEF3C7; color:#F59E0B; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="clock" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">PENDING</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${st.pending || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Awaiting Approval</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#DBEAFE; color:#2563EB; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="check-check" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">CONFIRMED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${st.confirmed || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Payment Verified</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#DCFCE7; color:#0F2418; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="truck" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">SHIPPED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${st.shipped || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">In Dispatch</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#D1FAE5; color:#16A34A; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="package-check" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">DELIVERED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${st.delivered || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Completed</span>
                    </div>
                </div>
            `;
        }

        // 7. Render Recent Activity Feed Timeline
        const activityContainer = document.getElementById('container-recent-activity');
        if (activityContainer && analytics.activityFeed) {
            const feed = analytics.activityFeed;
            if (feed.length === 0) {
                activityContainer.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#EFF6FF; color:#2563EB; display:flex; align-items:center; justify-content:center;"><i data-lucide="shopping-cart" style="width:14px; height:14px;"></i></div>
                                <div>
                                    <div style="font-weight:700; font-size:0.8rem; color:#1C1C1C;">New Order Created</div>
                                    <div style="font-size:0.72rem; color:#667085;">Order #ORD-00027 has been placed</div>
                                </div>
                            </div>
                            <span style="font-size:0.68rem; font-weight:700; color:#2563EB; background:#EFF6FF; padding:2px 8px; border-radius:10px;">New</span>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#F0FDF4; color:#16A34A; display:flex; align-items:center; justify-content:center;"><i data-lucide="check" style="width:14px; height:14px;"></i></div>
                                <div>
                                    <div style="font-weight:700; font-size:0.8rem; color:#1C1C1C;">Payment Verified</div>
                                    <div style="font-size:0.72rem; color:#667085;">Order #ORD-00026 payment confirmed</div>
                                </div>
                            </div>
                            <span style="font-size:0.68rem; font-weight:700; color:#16A34A; background:#F0FDF4; padding:2px 8px; border-radius:10px;">Success</span>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#FFFBEB; color:#F59E0B; display:flex; align-items:center; justify-content:center;"><i data-lucide="mouse-pointer" style="width:14px; height:14px;"></i></div>
                                <div>
                                    <div style="font-weight:700; font-size:0.8rem; color:#1C1C1C;">Affiliate Click</div>
                                    <div style="font-size:0.72rem; color:#667085;">New click from kira2024</div>
                                </div>
                            </div>
                            <span style="font-size:0.68rem; font-weight:700; color:#F59E0B; background:#FFFBEB; padding:2px 8px; border-radius:10px;">Click</span>
                        </div>
                    </div>
                `;
            } else {
                activityContainer.innerHTML = feed.map(item => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:28px; height:28px; border-radius:50%; background:rgba(212,175,55,0.12); color:#D4AF37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <i data-lucide="activity" style="width:14px; height:14px;"></i>
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:0.8rem; color:#1C1C1C;">${esc(item.title)}</div>
                                <div style="font-size:0.72rem; color:#667085;">${esc(item.subtitle)}</div>
                            </div>
                        </div>
                        <span style="font-size:0.68rem; color:#9CA3AF; font-weight:500;">${new Date(item.time).toLocaleTimeString()}</span>
                    </div>
                `).join('');
            }
        }

        // Initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // 3. User Management
    async function renderUsersList() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        let users = [];
        if (window.AdminService) {
            try {
                users = await window.AdminService.getUsers();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching users:', e);
            }
        }
        tbody.innerHTML = '';

        users.forEach(u => {
            const date = new Date(u.created_at || u.joinedAt || Date.now()).toLocaleDateString();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(u.id.slice(0, 8))}</strong></td>
                <td>${esc(u.name)}</td>
                <td>${esc(u.email)}</td>
                <td><span class="aff-badge ${u.role === 'admin' ? 'paid' : u.role === 'affiliate' ? 'approved' : 'pending'}">${esc(u.role)}</span></td>
                <td>${date}</td>
                <td>
                    <select class="aff-select" style="padding:0.4rem; font-size:0.8rem; width:auto;" onchange="changeUserRole('${esc(u.id)}', this.value)">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="affiliate" ${u.role === 'affiliate' ? 'selected' : ''}>Affiliate</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    window.changeUserRole = async function(userId, newRole) {
        const confirmed = await showConfirmModal('Modify User Role', `Are you sure you want to change this user's role to <strong>${newRole}</strong>?`);
        if (!confirmed) {
            renderUsersList(); // restore
            return;
        }

        try {
            if (window.AdminService) {
                await window.AdminService.changeUserRole(userId, newRole);
            }
            showToast(`User role updated to ${newRole}!`, 'success');
            renderUsersList();
            renderDashboardStats();
        } catch (err) {
            showToast(err.message, 'error');
            renderUsersList();
        }
    };

    // 4. Affiliate Applications Queue
    async function renderApplicationsQueue() {
        const tbody = document.getElementById('apps-table-body');
        if (!tbody) return;

        let apps = [];
        if (window.AdminService) {
            try {
                apps = await window.AdminService.getApplications();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching applications:', e);
            }
        }
        tbody.innerHTML = '';

        const pendingApps = apps.filter(a => a.status === 'pending');

        if (pendingApps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No pending applications in queue. / በመጠባበቅ ላይ ያለ ማመልከቻ የለም።</td></tr>';
            return;
        }

        pendingApps.forEach(a => {
            const date = new Date(a.submittedAt).toLocaleDateString();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(a.id)}</strong></td>
                <td>${esc(a.name)}</td>
                <td>${esc(a.phone)}<br>${esc(a.country)}</td>
                <td>
                    ${a.socials.instagram ? `<a href="${esc(a.socials.instagram)}" target="_blank">Insta</a><br>` : ''}
                    ${a.socials.tiktok ? `<a href="${esc(a.socials.tiktok)}" target="_blank">TikTok</a><br>` : ''}
                    ${a.socials.youtube ? `<a href="${esc(a.socials.youtube)}" target="_blank">YouTube</a>` : ''}
                </td>
                <td style="max-width:200px; font-size:0.8rem; color:#555;">${esc(a.whyApply)}</td>
                <td>${date}</td>
                <td>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="approveApp('${esc(a.userId)}', '${esc(a.name)}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectApp('${esc(a.userId)}', '${esc(a.name)}')">Reject</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    window.approveApp = async function(userId, name) {
        const confirmed = await showConfirmModal('Approve Affiliate Application', `Are you sure you want to approve the application for <strong>${name}</strong>?`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const currentUser = await window.getCurrentUser();
                    await window.AdminService.approveApplication(userId, currentUser.id);
                }
                
                // Add notification in local DB for dashboard updates compatibility
                if (window.AmieleDB) {
                    window.AmieleDB.addNotification(
                        userId, 
                        'Partnership Approved! 🎉', 
                        'Congratulations! Your partnership application has been approved. You are now an active Amiele affiliate.', 
                        'announcement'
                    );
                }

                showToast('Application approved! User role upgraded to Affiliate.', 'success');
                renderApplicationsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.rejectApp = async function(userId, name) {
        const confirmed = await showConfirmModal('Reject Affiliate Application', `Are you sure you want to reject the application for <strong>${name}</strong>?`, true);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const currentUser = await window.getCurrentUser();
                    await window.AdminService.rejectApplication(userId, currentUser.id);
                }
                
                if (window.AmieleDB) {
                    window.AmieleDB.addNotification(
                        userId, 
                        'Application Declined', 
                        'Your affiliate application has been declined at this time.', 
                        'announcement'
                    );
                }

                showToast('Application declined.', 'warning');
                renderApplicationsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.clearAllOrders = async function() {
        const confirmed = await showConfirmModal('Clear All Orders', 'Are you sure you want to clear all order records from Order Management?');
        if (confirmed) {
            if (window.AdminService && typeof window.AdminService.clearAllOrders === 'function') {
                await window.AdminService.clearAllOrders();
            }
            showToast('All order records cleared.', 'success');
            renderCommissionsQueue();
        }
    };

    // 5. Order Management Queue
    let currentFulfillmentFilter = 'all';
    let currentFulfillmentQuery = '';
    let cachedFulfillmentOrders = [];

    window.filterFulfillmentOrders = function(filterName, btnEl) {
        currentFulfillmentFilter = filterName;
        document.querySelectorAll('.fulfillment-filter-btn').forEach(btn => btn.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        renderCommissionsQueueUI();
    };

    window.searchFulfillmentOrders = function(query) {
        currentFulfillmentQuery = (query || '').toLowerCase().trim();
        renderCommissionsQueueUI();
    };

    // 5. Order Management Queue & Fulfillment Workflow
    async function renderCommissionsQueue() {
        if (window.AdminService) {
            try {
                cachedFulfillmentOrders = await window.AdminService.getOrders();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching orders:', e);
            }
        }
        renderCommissionsQueueUI();
    }

    function renderCommissionsQueueUI() {
        const tbody = document.getElementById('commissions-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!cachedFulfillmentOrders || cachedFulfillmentOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No orders logged yet.</td></tr>';
            return;
        }

        let filtered = cachedFulfillmentOrders.filter(o => {
            if (currentFulfillmentFilter !== 'all') {
                const fSt = (o.fulfillmentStatus || 'Pending').toLowerCase();
                if (fSt !== currentFulfillmentFilter.toLowerCase()) return false;
            }
            if (currentFulfillmentQuery) {
                const searchStr = `${o.orderNumber} ${o.customerName} ${o.customerEmail} ${o.phone} ${o.productName} ${o.country} ${o.affiliateCode}`.toLowerCase();
                if (!searchStr.includes(currentFulfillmentQuery)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2.5rem 0; color: var(--aff-text-muted);">No matching orders found.</td></tr>';
            return;
        }

        filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(o => {
            const date = new Date(o.createdAt).toLocaleDateString();

            const stageLower = (o.fulfillmentStatus || 'Pending').toLowerCase().replace(/\s+/g, '-');
            const stageBadge = `<span class="fulfillment-badge ${stageLower}">${esc(o.fulfillmentStatus || 'Pending')}</span>`;

            let payBadgeClass = o.paymentStatus === 'paid' ? 'confirmed' : (o.paymentStatus === 'failed' ? 'cancelled' : 'pending');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(o.orderNumber)}</strong></td>
                <td>${esc(o.customerName)}<br><small style="color:var(--aff-text-muted);">${esc(o.customerEmail)} | 📞 ${esc(o.phone)}</small></td>
                <td>${esc(o.productName)}</td>
                <td>${esc(o.country)}</td>
                <td>${esc(o.referralCode)}<br><small style="color:var(--aff-text-muted);">${esc(o.affiliateCode)}</small></td>
                <td><span class="aff-badge ${payBadgeClass}">${esc(o.paymentStatus)}</span></td>
                <td>${stageBadge}</td>
                <td style="font-weight:700; color:#0F2418;">ETB ${o.orderAmount.toLocaleString()}</td>
                <td style="font-size:0.8rem;">${date}</td>
                <td style="text-align:right;">
                    <button class="aff-btn-sm" style="background:#0F2418; color:#FFD700; border:none; border-radius:8px; padding:6px 12px; font-weight:700; font-size:0.75rem; cursor:pointer;" onclick="openOrderFulfillmentModal('${esc(o.id)}')">
                        <i data-lucide="eye" style="width:13px; height:13px; vertical-align:middle; margin-right:4px;"></i> Details & Actions
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    // WhatsApp Automated Notification Generator
    window.generateWhatsAppFulfillmentMessage = function(order, stage, shippingCompany = '', trackingNo = '') {
        const name = order.customerName || 'Valued Customer';
        const num = order.orderNumber || '#ORD-0001';
        const courier = shippingCompany || order.shippingCompany || 'DHL Express';
        const tracking = trackingNo || order.trackingNumber || 'N/A';

        switch (stage) {
            case 'Payment Verified':
                return `Hello ${name},\n\nWe have received your payment.\nYour order ${num} is now confirmed.\n\nThank you for supporting Ethiopian craftsmanship.`;
            case 'Preparing':
                return `Hello ${name},\n\nOur team has started preparing your handmade instrument.\nWe will keep you updated.`;
            case 'Crafting':
                return `Hello ${name},\n\nYour Begena/Kirar is currently being handcrafted by our artisan.`;
            case 'Packed':
                return `Hello ${name},\n\nYour instrument has been carefully packed and is ready for shipment.`;
            case 'Shipped':
                return `Hello ${name},\n\nGreat news!\nYour order has been shipped.\n\nCourier: ${courier}\nTracking Number: ${tracking}\n\nThank you for choosing Amiele Begena.`;
            case 'Delivered':
                return `Hello ${name},\n\nAccording to our records your order has been delivered.\nWe hope you enjoy your handmade instrument.\n\nThank you for supporting Ethiopian craftsmanship.`;
            case 'Cancelled':
                return `Hello ${name},\n\nYour order ${num} has been cancelled.\nPlease contact our support team if you have any questions.`;
            default:
                return `Hello ${name},\n\nUpdate regarding your order ${num}: Status is currently ${stage}.\n\nThank you for supporting Amiele Begena.`;
        }
    };

    // Open Order Fulfillment Workflow Modal
    window.openOrderFulfillmentModal = function(orderId) {
        const order = cachedFulfillmentOrders.find(o => o.id === orderId);
        if (!order) {
            showToast('Order details not found.', 'error');
            return;
        }

        const modalEl = document.getElementById('order-details-modal-backdrop');
        const modalTitle = document.getElementById('modal-order-number');
        const modalBody = document.getElementById('order-details-modal-body');

        if (modalTitle) {
            modalTitle.textContent = `Order ${order.orderNumber}`;
        }

        const stages = ['Pending', 'Payment Verified', 'Preparing', 'Crafting', 'Packed', 'Shipped', 'Delivered'];
        const currentStageIdx = stages.indexOf(order.fulfillmentStatus || 'Pending');

        // Render Horizontal Timeline
        let timelineHtml = '<div class="fulfillment-timeline">';
        stages.forEach((stg, idx) => {
            let stepClass = '';
            let stepIcon = idx + 1;
            let timestampText = '';

            if (order.fulfillmentStatus === 'Cancelled') {
                stepClass = idx === 0 ? 'completed' : '';
            } else if (idx < currentStageIdx) {
                stepClass = 'completed';
                stepIcon = '✓';
            } else if (idx === currentStageIdx) {
                stepClass = 'current';
                stepIcon = '●';
            }

            if (order.history && order.history.length > 0) {
                const hItem = order.history.find(h => h.status === stg);
                if (hItem) {
                    timestampText = new Date(hItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }

            timelineHtml += `
                <div class="timeline-step ${stepClass}">
                    <div class="step-icon">${stepIcon}</div>
                    <div class="step-title">${esc(stg)}</div>
                    <div class="step-time">${esc(timestampText)}</div>
                </div>
            `;
        });
        timelineHtml += '</div>';

        const initialWaMsg = generateWhatsAppFulfillmentMessage(order, order.fulfillmentStatus || 'Payment Verified');
        const cleanPhone = (order.phone || '').replace(/[^0-9]/g, '');

        modalBody.innerHTML = `
            ${timelineHtml}

            <!-- 1. Customer & Order Information Grid -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="user-check" style="width:16px; height:16px; color:#D4AF37;"></i> Customer & Order Overview
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; font-size:0.82rem;">
                    <div><span style="color:#667085;">Customer Name:</span><br><strong style="color:#0F2418;">${esc(order.customerName)}</strong></div>
                    <div><span style="color:#667085;">Phone Number:</span><br><strong>📞 ${esc(order.phone)}</strong></div>
                    <div><span style="color:#667085;">Email Address:</span><br><strong>${esc(order.customerEmail)}</strong></div>
                    <div><span style="color:#667085;">Delivery Country:</span><br><strong>${esc(order.country)}</strong></div>
                    <div><span style="color:#667085;">Product Purchased:</span><br><strong style="color:#0F2418;">${esc(order.productName)}</strong></div>
                    <div><span style="color:#667085;">Quantity:</span><br><strong>${esc(order.quantity)} Unit(s)</strong></div>
                    <div><span style="color:#667085;">Total Order Value:</span><br><strong style="color:#16A34A; font-size:1rem;">ETB ${order.orderAmount.toLocaleString()}</strong></div>
                    <div><span style="color:#667085;">Affiliate Referral:</span><br><strong>${esc(order.referralCode)} (${esc(order.affiliateCode)})</strong></div>
                    <div><span style="color:#667085;">Payment Status:</span><br><span class="aff-badge ${order.paymentStatus === 'paid' ? 'confirmed' : 'pending'}">${esc(order.paymentStatus)}</span></div>
                    <div><span style="color:#667085;">Current Stage:</span><br><span class="fulfillment-badge ${(order.fulfillmentStatus || 'Pending').toLowerCase().replace(/\s+/g, '-')}">${esc(order.fulfillmentStatus || 'Pending')}</span></div>
                </div>
            </div>

            <!-- 2. Shipping & Tracking Details -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="truck" style="width:16px; height:16px; color:#0F2418;"></i> Shipping & Dispatch Information
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; font-size:0.82rem; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Courier / Shipping Company</label>
                        <input type="text" id="modal-courier-input" value="${esc(order.shippingCompany || '')}" placeholder="e.g. DHL Express, FedEx" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Tracking Number</label>
                        <input type="text" id="modal-tracking-input" value="${esc(order.trackingNumber || '')}" placeholder="e.g. DHL-98234120" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Estimated Delivery</label>
                        <input type="text" id="modal-est-delivery-input" value="${esc(order.estimatedDelivery || '')}" placeholder="e.g. Aug 5 - Aug 8" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                </div>
                <div>
                    <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Shipping & Dispatch Notes</label>
                    <textarea id="modal-shipping-notes" rows="2" placeholder="Packaging requirements, fragile wood handling, artisan signature details..." style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">${esc(order.shippingNotes || '')}</textarea>
                </div>
            </div>

            <!-- 3. Fulfillment Action Buttons -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="zap" style="width:16px; height:16px; color:#D4AF37;"></i> Update Order Fulfillment Stage
                </div>
                <div class="fulfillment-actions-grid">
                    <button class="action-btn-stage btn-verify" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Payment Verified')">
                        <i data-lucide="check-check" style="width:14px; height:14px;"></i> Verify Payment
                    </button>
                    <button class="action-btn-stage btn-prepare" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Preparing')">
                        <i data-lucide="scissors" style="width:14px; height:14px;"></i> Start Preparing
                    </button>
                    <button class="action-btn-stage btn-craft" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Crafting')">
                        <i data-lucide="hammer" style="width:14px; height:14px;"></i> Start Crafting
                    </button>
                    <button class="action-btn-stage btn-pack" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Packed')">
                        <i data-lucide="package" style="width:14px; height:14px;"></i> Pack Order
                    </button>
                    <button class="action-btn-stage btn-ship" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Shipped')">
                        <i data-lucide="truck" style="width:14px; height:14px;"></i> Mark Shipped
                    </button>
                    <button class="action-btn-stage btn-deliver" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Delivered')">
                        <i data-lucide="package-check" style="width:14px; height:14px;"></i> Mark Delivered
                    </button>
                    <button class="action-btn-stage btn-cancel" onclick="triggerFulfillmentStageUpdate('${order.id}', 'Cancelled')">
                        <i data-lucide="x-circle" style="width:14px; height:14px;"></i> Cancel Order
                    </button>
                </div>
            </div>

            <!-- 4. Automated WhatsApp Customer Update -->
            <div class="fulfillment-section-card" style="background:#F0FDF4; border-color:#BBF7D0;">
                <div class="fulfillment-section-title" style="color:#0F2418;">
                    <i data-lucide="message-square" style="width:16px; height:16px; color:#16A34A;"></i> Automated WhatsApp Customer Message
                </div>
                <p style="font-size:0.75rem; color:#667085; margin:0 0 8px 0;">Auto-generated status notification tailored for customer delivery via WhatsApp:</p>
                <textarea id="modal-wa-preview" rows="4" style="width:100%; padding:10px; border-radius:8px; border:1px solid #BBF7D0; font-size:0.8rem; background:#FFFFFF; font-family:monospace; margin-bottom:10px;">${esc(initialWaMsg)}</textarea>
                <a id="modal-wa-send-btn" href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(initialWaMsg)}" target="_blank" class="aff-btn" style="background:#25D366; color:#FFFFFF; border:none; text-decoration:none; font-weight:800; font-size:0.82rem; padding:8px 16px; border-radius:8px; display:inline-flex; align-items:center; gap:8px;">
                    <i class="fa-brands fa-whatsapp" style="font-size:1.1rem;"></i> Send Update via WhatsApp
                </a>
            </div>

            <!-- 5. History Audit Log -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="history" style="width:16px; height:16px; color:#667085;"></i> Order Fulfillment History Log
                </div>
                <div style="max-height:180px; overflow-y:auto; font-size:0.78rem;">
                    ${order.history && order.history.length > 0 ? order.history.map(h => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                            <div>
                                <span class="fulfillment-badge ${(h.status || '').toLowerCase().replace(/\s+/g, '-')}">${esc(h.status)}</span>
                                <span style="margin-left:8px; color:#1C1C1C; font-weight:600;">${esc(h.notes || '')}</span>
                            </div>
                            <div style="text-align:right; color:#667085; font-size:0.72rem;">
                                <span>by ${esc(h.admin_name || 'Admin')}</span> • <span>${new Date(h.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join('') : '<div style="color:#667085; text-align:center; padding:10px;">No timeline history logs yet.</div>'}
                </div>
            </div>
        `;

        modalEl.classList.add('show');
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeOrderFulfillmentModal = function() {
        const modalEl = document.getElementById('order-details-modal-backdrop');
        if (modalEl) modalEl.classList.remove('show');
    };

    window.triggerFulfillmentStageUpdate = async function(orderId, newStage) {
        const courier = document.getElementById('modal-courier-input') ? document.getElementById('modal-courier-input').value.trim() : '';
        const trackingNo = document.getElementById('modal-tracking-input') ? document.getElementById('modal-tracking-input').value.trim() : '';
        const estDelivery = document.getElementById('modal-est-delivery-input') ? document.getElementById('modal-est-delivery-input').value.trim() : '';
        const notes = document.getElementById('modal-shipping-notes') ? document.getElementById('modal-shipping-notes').value.trim() : '';

        try {
            const currentUser = await window.getCurrentUser();
            await window.AdminService.updateFulfillmentStatus(orderId, newStage, {
                tracking_number: trackingNo,
                shipping_company: courier,
                shipping_notes: notes,
                estimated_delivery: estDelivery
            }, notes || `Order stage updated to ${newStage}`, currentUser);

            showToast(`Order status updated to ${newStage}!`, 'success');

            // Re-fetch orders list and re-open modal with fresh data
            cachedFulfillmentOrders = await window.AdminService.getOrders();
            renderCommissionsQueueUI();
            renderDashboardStats();

            openOrderFulfillmentModal(orderId);
        } catch (err) {
            showToast(err.message || 'Failed to update fulfillment status', 'error');
        }
    };

    window.approveOrderPayment = async function(orderId, orderNumber) {
        const confirmed = await showConfirmModal('Approve Payment', `Approve payment for order <strong>${orderNumber}</strong>? This will calculate and credit the affiliate commission automatically.`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const result = await window.AdminService.approvePayment(orderId);
                    if (result && result.commission_attributed) {
                        showToast(`Payment approved! Commission of ETB ${Math.round(result.commission_amount).toLocaleString()} credited to affiliate.`, 'success');
                    } else {
                        showToast('Payment approved! (No affiliate referral on this order)', 'success');
                    }
                }
                renderCommissionsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.rejectOrderPayment = async function(orderId, orderNumber) {
        const confirmed = await showConfirmModal('Reject Payment', `Reject payment for order <strong>${orderNumber}</strong>? The order will be cancelled.`, true);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    await window.AdminService.rejectPayment(orderId);
                }
                showToast('Payment rejected. Order cancelled.', 'warning');
                renderCommissionsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.cancelOrder = async function(orderId) {
        const confirmed = await showConfirmModal('Cancel Order', 'Are you sure you want to cancel this order?', true);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    await window.AdminService.updateOrderStatus(orderId, 'cancelled');
                }
                showToast('Order cancelled.', 'warning');
                renderCommissionsQueue();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.markOrderShipped = async function(orderId) {
        try {
            if (window.AdminService) {
                await window.AdminService.updateOrderStatus(orderId, 'shipped');
            }
            showToast('Order marked as shipped!', 'success');
            renderCommissionsQueue();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    window.markOrderDelivered = async function(orderId) {
        try {
            if (window.AdminService) {
                await window.AdminService.updateOrderStatus(orderId, 'delivered');
            }
            showToast('Order marked as delivered!', 'success');
            renderCommissionsQueue();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // 6. Withdrawals Queue
    async function renderWithdrawalsQueue() {
        const tbody = document.getElementById('withdrawals-table-body');
        if (!tbody) return;

        let withdrawals = [];
        if (window.AdminService) {
            try {
                withdrawals = await window.AdminService.getWithdrawals();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching withdrawals queue:', e);
            }
        }
        tbody.innerHTML = '';

        if (withdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No withdrawal requests logs.</td></tr>';
            return;
        }

        withdrawals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => {
            const date = new Date(w.createdAt).toLocaleDateString();
            
            let actions = '-';
            if (w.status === 'pending') {
                actions = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#1565c0;" onclick="approveWithdrawal('${esc(w.rawId)}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectWithdrawal('${esc(w.rawId)}')">Reject</button>
                `;
            } else if (w.status === 'approved') {
                actions = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="markWithdrawalPaid('${esc(w.rawId)}')">Mark Paid</button>
                `;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(w.id)}</strong></td>
                <td>${esc(w.affiliateId)}</td>
                <td style="font-weight:600;">ETB ${w.amount.toLocaleString()}</td>
                <td>${esc(w.method)}<br>${esc(w.phone)}<br><small style="color:var(--aff-text-muted);">${esc(w.account || '—')}</small></td>
                <td>${date}</td>
                <td><span class="aff-badge ${esc(w.status)}">${esc(w.status)}</span></td>
                <td>${actions}</td>
            `;
            tbody.appendChild(row);
        });
    }

    window.approveWithdrawal = async function(wId) {
        const confirmed = await showConfirmModal('Approve Withdrawal Request', `Approve payout request?`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    await window.AdminService.updateWithdrawalStatus(wId, 'approved', user.id);
                }
                showToast('Withdrawal request approved!', 'success');
                renderWithdrawalsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.rejectWithdrawal = async function(wId) {
        const confirmed = await showConfirmModal('Reject Withdrawal Request', `Are you sure you want to decline this request? Funds will return to affiliate balance.`, true);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    await window.AdminService.updateWithdrawalStatus(wId, 'rejected', user.id);
                }
                showToast('Withdrawal rejected.', 'warning');
                renderWithdrawalsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.markWithdrawalPaid = async function(wId) {
        const confirmed = await showConfirmModal('Mark Withdrawal as PAID', `Mark request as successfully paid to partner?`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    await window.AdminService.updateWithdrawalStatus(wId, 'paid', user.id);
                }
                showToast('Withdrawal marked as PAID successfully.', 'success');
                renderWithdrawalsQueue();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    };

    window.exportCommissionCenter = async function(format) {
        if (!window.AdminService) { showToast('AdminService unavailable', 'error'); return; }
        const data = await window.AdminService.getCommissionCenterData();
        if (!data || !data.ledger || data.ledger.length === 0) { showToast('No data to export', 'warning'); return; }

        const rows = data.ledger.map(l => ({
            Affiliate: l.affiliateName,
            'Order Number': l.orderNumber,
            Customer: l.customerName,
            Product: l.productName,
            'Product Price (ETB)': l.productPrice,
            'Commission %': l.commissionPct,
            'Commission Amount (ETB)': l.commissionAmount,
            Status: l.status,
            'Payment Date': l.paymentDate ? new Date(l.paymentDate).toLocaleDateString() : '—',
            'Withdrawal Date': l.withdrawalDate ? new Date(l.withdrawalDate).toLocaleDateString() : '—'
        }));

        if (format === 'csv') {
            const headers = Object.keys(rows[0]).join(',');
            const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            const csv = headers + '\n' + csvRows.join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'commission_center_' + new Date().toISOString().slice(0, 10) + '.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('CSV exported successfully', 'success');
        } else if (format === 'excel') {
            // Generates an HTML table wrapped as .xls for Excel compatibility
            let html = '<table><thead><tr>';
            Object.keys(rows[0]).forEach(h => { html += '<th>' + h + '</th>'; });
            html += '</tr></thead><tbody>';
            rows.forEach(r => {
                html += '<tr>';
                Object.values(r).forEach(v => { html += '<td>' + String(v) + '</td>'; });
                html += '</tr>';
            });
            html += '</tbody></table>';
            const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'commission_center_' + new Date().toISOString().slice(0, 10) + '.xls';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('Excel exported successfully', 'success');
        }
    };

    // Commission Center
    async function renderCommissionCenter() {
        const data = window.AdminService ? await window.AdminService.getCommissionCenterData() : null;
        if (!data) {
            document.getElementById('cc-total') && (document.getElementById('cc-total').textContent = 'No data');
            return;
        }

        // KPIs
        const kpi = data.kpis;
        const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setKpi('cc-total', 'ETB ' + kpi.totalCommission.toLocaleString());
        setKpi('cc-pending', 'ETB ' + kpi.pending.toLocaleString());
        setKpi('cc-available', 'ETB ' + kpi.available.toLocaleString());
        setKpi('cc-paid', 'ETB ' + kpi.paid.toLocaleString());
        setKpi('cc-withdrawn', 'ETB ' + kpi.withdrawn.toLocaleString());
        setKpi('cc-affiliates', kpi.affiliateCount);
        setKpi('cc-payout-requests', kpi.payoutRequests);

        // Rankings
        const rankDiv = document.getElementById('cc-rankings');
        if (rankDiv) {
            if (data.rankings.length === 0) {
                rankDiv.innerHTML = '<p style="color:var(--aff-text-muted);">No affiliate earnings yet.</p>';
            } else {
                let html = '<table class="aff-table"><thead><tr><th>#</th><th>Affiliate</th><th>Total Earned</th><th>Sales</th><th>Avg Commission</th></tr></thead><tbody>';
                data.rankings.slice(0, 10).forEach((r, i) => {
                    html += `<tr><td>${i + 1}</td><td><strong>${esc(r.name)}</strong></td><td>ETB ${r.totalEarned.toLocaleString()}</td><td>${r.salesCount}</td><td>ETB ${r.avgCommission.toLocaleString()}</td></tr>`;
                });
                html += '</tbody></table>';
                rankDiv.innerHTML = html;
            }
        }

        // Monthly
        const monthDiv = document.getElementById('cc-monthly');
        if (monthDiv) {
            if (data.monthly.length === 0) {
                monthDiv.innerHTML = '<p style="color:var(--aff-text-muted);">No monthly data.</p>';
            } else {
                let html = '<table class="aff-table"><thead><tr><th>Month</th><th>Commission (ETB)</th><th>Bar</th></tr></thead><tbody>';
                const maxAmt = Math.max(...data.monthly.map(m => m.amount), 1);
                data.monthly.forEach(m => {
                    const pct = Math.round((m.amount / maxAmt) * 100);
                    html += `<tr><td>${m.month}</td><td>ETB ${m.amount.toLocaleString()}</td><td><div style="height:8px; width:${pct}%; max-width:200px; background:var(--aff-primary); border-radius:4px;"></div></td></tr>`;
                });
                html += '</tbody></table>';
                monthDiv.innerHTML = html;
            }
        }

        // Ledger table
        const tbody = document.getElementById('commission-center-body');
        if (tbody) {
            tbody.innerHTML = '';
            if (data.ledger.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:2rem;">No commission records found.</td></tr>';
            } else {
                data.ledger.forEach(l => {
                    const pDate = l.paymentDate ? new Date(l.paymentDate).toLocaleDateString() : '—';
                    const wDate = l.withdrawalDate ? new Date(l.withdrawalDate).toLocaleDateString() : '—';
                    const row = document.createElement('tr');
                    const statusClass = l.status === 'available' && l.withdrawalStatus ? 'withdrawn' : l.status;
                    row.innerHTML = `
                        <td>${esc(l.affiliateName)}</td>
                        <td><strong>${esc(l.orderNumber)}</strong></td>
                        <td>${esc(l.customerName)}</td>
                        <td>${esc(l.productName)}</td>
                        <td>ETB ${l.productPrice.toLocaleString()}</td>
                        <td>${l.commissionPct}%</td>
                        <td style="font-weight:600;">ETB ${l.commissionAmount.toLocaleString()}</td>
                        <td><span class="aff-badge ${esc(statusClass)}">${esc(l.status)}${l.withdrawalStatus ? ' (in payout)' : ''}</span></td>
                        <td>${pDate}</td>
                        <td>${wDate}</td>
                        <td><button class="aff-btn" style="padding:0.3rem 0.6rem;font-size:0.75rem;background:#14231b;" onclick="viewAffiliate('${esc(l.affiliateId)}')">View</button></td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }

        // Recent activity
        const actDiv = document.getElementById('cc-activity');
        if (actDiv) {
            if (data.recentActivity.length === 0) {
                actDiv.innerHTML = '<p style="color:var(--aff-text-muted);">No recent activity.</p>';
            } else {
                let html = '<div style="display:flex;flex-direction:column;gap:0.75rem;">';
                data.recentActivity.forEach(a => {
                    const d = a.date ? new Date(a.date).toLocaleDateString() : '—';
                    const statusBadge = `<span class="aff-badge ${esc(a.status)}">${esc(a.status)}</span>`;
                    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--aff-card-border);">
                        <div><strong>${esc(a.affiliateName)}</strong> — ${esc(a.orderNumber)} / ${esc(a.productName)}</div>
                        <div style="text-align:right;">ETB ${a.commissionAmount.toLocaleString()} ${statusBadge}<br><small style="color:var(--aff-text-muted);">${d}</small></div>
                    </div>`;
                });
                html += '</div>';
                actDiv.innerHTML = html;
            }
        }
    }

    window.viewAffiliate = function(affId) {
        showToast('Affiliate ID: ' + affId + ' — detailed view coming in future update.', 'info');
    };

    // 7. Campaigns Challenge Creator
    async function renderCampaignsList() {
        const tbody = document.getElementById('campaigns-table-body');
        if (!tbody) return;

        let campaigns = [];
        const client = window.AmieleSupabase.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('affiliate_campaigns')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) campaigns = data;
            } catch (e) {
                console.error('[Amiele:Admin] Error querying campaigns:', e);
            }
        }
        tbody.innerHTML = '';

        campaigns.forEach(c => {
            const endsAt = new Date(c.ends_at);
            const diffTime = Math.max(0, endsAt - new Date());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(c.id.slice(0, 8))}</strong></td>
                <td>${esc(c.title)}</td>
                <td>${esc(c.description)}</td>
                <td>${esc(c.target_sales)} sales</td>
                <td>ETB ${parseFloat(c.reward).toLocaleString()}</td>
                <td>${diffDays} days</td>
                <td><span class="aff-badge active">${esc(c.status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    const campaignForm = document.getElementById('create-campaign-form');
    if (campaignForm) {
        campaignForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('cmp-title').value.trim();
            const desc = document.getElementById('cmp-desc').value.trim();
            const target = parseInt(document.getElementById('cmp-target').value);
            const reward = parseFloat(document.getElementById('cmp-reward').value);
            const days = parseInt(document.getElementById('cmp-days').value);

            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + days);

            const submitBtn = campaignForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            try {
                if (window.AdminService) {
                    await window.AdminService.createCampaign(title, desc, target, reward, endsAt.toISOString(), user.id);
                }
                showToast('Bonus campaign challenge created successfully!', 'success');
                campaignForm.reset();
                renderCampaignsList();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // 8. Announcements Creator
    async function renderAnnouncementsList() {
        const tbody = document.getElementById('ann-table-body');
        if (!tbody) return;

        let announcements = [];
        const client = window.AmieleSupabase.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('affiliate_announcements')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) announcements = data;
            } catch (e) {
                console.error('[Amiele:Admin] Error querying announcements:', e);
            }
        }
        tbody.innerHTML = '';

        announcements.forEach(a => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(a.id.slice(0, 8))}</strong></td>
                <td>${esc(a.title)}</td>
                <td>${esc(a.content)}</td>
                <td><span class="aff-badge approved">${esc(a.type)}</span></td>
                <td><span class="aff-badge ${a.urgency === 'high' || a.urgency === 'critical' ? 'rejected' : 'pending'}">${esc(a.urgency)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    const annForm = document.getElementById('create-ann-form');
    if (annForm) {
        annForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('ann-title').value.trim();
            const content = document.getElementById('ann-content').value.trim();
            const type = document.getElementById('ann-type').value;
            const urgency = document.getElementById('ann-urgency').value;

            const submitBtn = annForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publishing...';

            try {
                if (window.AdminService) {
                    await window.AdminService.createAnnouncement(title, content, type, urgency, user.id);
                }
                showToast('Announcement broadcasted successfully!', 'success');
                annForm.reset();
                renderAnnouncementsList();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // Initial load with retry
    renderDashboardStats();
    setTimeout(() => {
        renderDashboardStats();
    }, 600);

    // Global Admin Keyboard shortcuts listener
    document.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        // 1-7 Tab Navigation Routing
        const tabRoutes = {
            '1': 'dashboard',
            '2': 'users',
            '3': 'applications',
            '4': 'commissions',
            '5': 'withdrawals',
            '6': 'commission-center',
            '7': 'campaigns',
            '8': 'announcements'
        };

        if (tabRoutes[e.key]) {
            e.preventDefault();
            window.switchAdminTab(tabRoutes[e.key]);
            return;
        }

        // Keyboard Shortcut Help overlay dialog
        if (e.key === '?') {
            e.preventDefault();
            const helperHtml = `
                <div style="display:flex; flex-direction:column; gap:0.8rem; font-family:'Outfit',sans-serif; text-align:left;">
                    <p style="margin:0 0 1rem; color:var(--aff-text-muted);">Use these quick keys to browse through admin queues rapidly:</p>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">1</kbd> to <kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">8</kbd></span>
                        <span style="color:var(--aff-text-muted);">Navigate Admin Tabs</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Ctrl + K</kbd></span>
                        <span style="color:var(--aff-text-muted);">Launch Command Palette</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--aff-card-border); padding-bottom:6px;">
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">Esc</kbd></span>
                        <span style="color:var(--aff-text-muted);">Close Modal Backdrop</span>
                    </div>
                </div>
            `;
            showConfirmModal('Admin Shortcut Directory', helperHtml, false, 'Close Helper');
            return;
        }

        // Close active confirm modal backdrops with Escape
        if (e.key === 'Escape') {
            if (window.closeOrderFulfillmentModal) window.closeOrderFulfillmentModal();
            const backdrop = document.getElementById('custom-modal-backdrop');
            if (backdrop && backdrop.classList.contains('show')) {
                const cancelBtn = document.getElementById('modal-btn-cancel');
                if (cancelBtn) cancelBtn.click();
            }
        }
    });
});
