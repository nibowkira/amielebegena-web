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
        if (tabName === 'campaigns') renderCampaignsList();
        if (tabName === 'announcements') renderAnnouncementsList();
    };

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
        if (elTopAff && cards.topAffiliate) {
            elTopAff.textContent = cards.topAffiliate.name || 'N/A';
            if (elTopAffSub) elTopAffSub.textContent = `${cards.topAffiliate.salesCount || 0} Sales • ETB ${(cards.topAffiliate.totalEarnings || 0).toLocaleString()}`;
        }

        const elTopProd = document.getElementById('card-top-product');
        const elTopProdSub = document.getElementById('card-top-product-sub');
        if (elTopProd && cards.bestSellingProduct) {
            elTopProd.textContent = cards.bestSellingProduct.name || 'N/A';
            if (elTopProdSub) elTopProdSub.textContent = `${cards.bestSellingProduct.unitsSold || 0} Units Sold`;
        }

        const elAov = document.getElementById('card-aov');
        if (elAov) elAov.textContent = `ETB ${(cards.avgOrderValue || 0).toLocaleString()}`;


        // 2. Render Monthly Revenue Chart
        const chartContainer = document.getElementById('chart-monthly-revenue');
        if (chartContainer && analytics.monthlyRevenueData) {
            const data = analytics.monthlyRevenueData;
            const maxRev = Math.max(1, ...data.map(d => d.revenue));

            chartContainer.innerHTML = data.map(d => {
                const heightPct = Math.max(10, Math.round((d.revenue / maxRev) * 100));
                return `
                    <div class="admin-chart-bar-wrap">
                        <div class="admin-chart-bar" style="height:${heightPct}%;" data-tooltip="ETB ${d.revenue.toLocaleString()} (${d.ordersCount} Orders)"></div>
                        <span class="admin-chart-label">${esc(d.month)}</span>
                    </div>
                `;
            }).join('');
        }

        // 3. Render Orders by Country
        const countryContainer = document.getElementById('container-country-orders');
        if (countryContainer && analytics.countryList) {
            const list = analytics.countryList;
            if (list.length === 0) {
                countryContainer.innerHTML = '<div style="color:var(--aff-text-muted); font-size:0.85rem;">No orders recorded yet.</div>';
            } else {
                countryContainer.innerHTML = list.slice(0, 5).map(c => `
                    <div class="admin-progress-row">
                        <div class="admin-progress-header">
                            <span><i class="fas fa-map-marker-alt" style="color:#0288d1; margin-right:4px;"></i> ${esc(c.country)}</span>
                            <strong>${c.count} Orders (${c.percentage}%)</strong>
                        </div>
                        <div class="admin-progress-bg">
                            <div class="admin-progress-fill" style="width:${Math.max(5, c.percentage)}%; background:#0288d1;"></div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 4. Render Affiliate Leaderboard
        const affLeaderboardContainer = document.getElementById('container-affiliate-leaderboard');
        if (affLeaderboardContainer && analytics.affiliateLeaderboard) {
            const list = analytics.affiliateLeaderboard;
            if (list.length === 0) {
                affLeaderboardContainer.innerHTML = '<div style="color:var(--aff-text-muted); font-size:0.85rem;">No affiliate sales recorded yet.</div>';
            } else {
                affLeaderboardContainer.innerHTML = list.slice(0, 5).map((a, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:bold; color:${idx === 0 ? '#ffd700' : '#888'}; font-size:0.85rem;">#${idx + 1}</span>
                            <div>
                                <div style="font-weight:600; font-size:0.9rem;">${esc(a.name)}</div>
                                <span style="font-size:0.75rem; color:var(--aff-text-muted);">Ref: ${esc(a.code || 'N/A')}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:bold; color:var(--aff-primary); font-size:0.9rem;">${a.salesCount} Sales</div>
                            <span style="font-size:0.75rem; color:rgba(255,255,255,0.6);">ETB ${a.totalEarnings.toLocaleString()}</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 5. Render Best Selling Products
        const prodContainer = document.getElementById('container-top-products');
        if (prodContainer && analytics.topProductsList) {
            const list = analytics.topProductsList;
            if (list.length === 0) {
                prodContainer.innerHTML = '<div style="color:var(--aff-text-muted); font-size:0.85rem;">No product sales recorded yet.</div>';
            } else {
                prodContainer.innerHTML = list.slice(0, 5).map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                        <div>
                            <div style="font-weight:600; font-size:0.9rem;">${esc(p.name)}</div>
                            <span style="font-size:0.75rem; color:var(--aff-text-muted);">${p.unitsSold} Units Sold</span>
                        </div>
                        <strong style="color:#ffd700; font-size:0.9rem;">ETB ${p.revenueETB.toLocaleString()}</strong>
                    </div>
                `).join('');
            }
        }

        // 6. Render Order Status Breakdown & Customer Funnel
        const funnelContainer = document.getElementById('container-status-customer-analytics');
        if (funnelContainer) {
            const st = analytics.orderStatusBreakdown || {};
            const cust = analytics.customerAnalytics || {};
            const tot = cards.totalOrders || 1;

            funnelContainer.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem;">
                    <div style="background:rgba(237,108,2,0.1); border:1px solid rgba(237,108,2,0.25); padding:0.85rem; border-radius:10px; text-align:center;">
                        <span style="font-size:0.75rem; color:#ed6c02; text-transform:uppercase;">Pending</span>
                        <div style="font-size:1.4rem; font-weight:bold; color:#fff;">${st.pending || 0}</div>
                    </div>
                    <div style="background:rgba(46,125,50,0.1); border:1px solid rgba(46,125,50,0.25); padding:0.85rem; border-radius:10px; text-align:center;">
                        <span style="font-size:0.75rem; color:#2e7d32; text-transform:uppercase;">Confirmed</span>
                        <div style="font-size:1.4rem; font-weight:bold; color:#fff;">${st.confirmed || 0}</div>
                    </div>
                    <div style="background:rgba(2,136,209,0.1); border:1px solid rgba(2,136,209,0.25); padding:0.85rem; border-radius:10px; text-align:center;">
                        <span style="font-size:0.75rem; color:#0288d1; text-transform:uppercase;">Shipped</span>
                        <div style="font-size:1.4rem; font-weight:bold; color:#fff;">${st.shipped || 0}</div>
                    </div>
                    <div style="background:rgba(156,39,176,0.1); border:1px solid rgba(156,39,176,0.25); padding:0.85rem; border-radius:10px; text-align:center;">
                        <span style="font-size:0.75rem; color:#9c27b0; text-transform:uppercase;">Delivered</span>
                        <div style="font-size:1.4rem; font-weight:bold; color:#fff;">${st.delivered || 0}</div>
                    </div>
                </div>
                <div style="padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; font-size:0.85rem;">
                    <div>
                        <span style="color:var(--aff-text-muted);">Repeat Customer Rate:</span>
                        <strong style="color:#ffd700; margin-left:4px;">${cust.repeatRate || 0}%</strong>
                    </div>
                    <div>
                        <span style="color:var(--aff-text-muted);">Avg Spend / Customer:</span>
                        <strong style="color:#fff; margin-left:4px;">ETB ${(cust.avgCustomerSpend || 0).toLocaleString()}</strong>
                    </div>
                </div>
            `;
        }

        // 7. Render Recent Activity Feed
        const activityContainer = document.getElementById('container-recent-activity');
        if (activityContainer && analytics.activityFeed) {
            const feed = analytics.activityFeed;
            if (feed.length === 0) {
                activityContainer.innerHTML = '<div style="color:var(--aff-text-muted); font-size:0.85rem;">No recent system activity.</div>';
            } else {
                activityContainer.innerHTML = feed.map(item => `
                    <div class="admin-activity-item">
                        <div class="admin-activity-icon" style="background:${item.color}22; color:${item.color};">
                            <i class="fas ${esc(item.icon)}"></i>
                        </div>
                        <div style="flex-grow:1;">
                            <div style="font-weight:600; font-size:0.88rem; color:#fff;">${esc(item.title)}</div>
                            <div style="font-size:0.8rem; color:var(--aff-text-muted);">${esc(item.subtitle)}</div>
                            <span style="font-size:0.72rem; color:rgba(255,255,255,0.4);">${new Date(item.time).toLocaleString()}</span>
                        </div>
                    </div>
                `).join('');
            }
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
    async function renderCommissionsQueue() {
        const tbody = document.getElementById('commissions-table-body');
        if (!tbody) return;

        let orders = [];
        if (window.AdminService) {
            try {
                orders = await window.AdminService.getOrders();
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching orders:', e);
            }
        }
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No orders logged yet.</td></tr>';
            return;
        }

        orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(o => {
            const date = new Date(o.createdAt).toLocaleDateString();

            // Build action buttons based on payment and order status
            let actions = '';
            if (o.paymentStatus === 'pending_payment') {
                actions = `
                    <button class="aff-btn" style="padding:0.35rem 0.7rem; font-size:0.72rem; background-color:#2e7d32; margin:2px 0;" onclick="approveOrderPayment('${esc(o.id)}', '${esc(o.orderNumber)}')">✓ Approve Payment</button>
                    <button class="aff-btn" style="padding:0.35rem 0.7rem; font-size:0.72rem; background-color:#c62828; margin:2px 0;" onclick="rejectOrderPayment('${esc(o.id)}', '${esc(o.orderNumber)}')">✗ Reject</button>
                `;
            } else if (o.paymentStatus === 'paid') {
                if (o.orderStatus === 'confirmed') {
                    actions = `
                        <button class="aff-btn" style="padding:0.35rem 0.7rem; font-size:0.72rem; background-color:#1565c0; margin:2px 0;" onclick="markOrderShipped('${esc(o.id)}')">📦 Ship</button>
                        <button class="aff-btn" style="padding:0.35rem 0.7rem; font-size:0.72rem; background-color:#c62828; margin:2px 0;" onclick="cancelOrder('${esc(o.id)}')">Cancel</button>
                    `;
                } else if (o.orderStatus === 'shipped') {
                    actions = `
                        <button class="aff-btn" style="padding:0.35rem 0.7rem; font-size:0.72rem; background-color:#2e7d32; margin:2px 0;" onclick="markOrderDelivered('${esc(o.id)}')">✓ Delivered</button>
                    `;
                } else {
                    actions = '<span style="color:var(--aff-text-muted); font-size:0.75rem;">Complete</span>';
                }
            } else {
                actions = '<span style="color:var(--aff-text-muted); font-size:0.75rem;">—</span>';
            }

            // Payment badge color
            let payBadgeClass = o.paymentStatus === 'paid' ? 'confirmed' : (o.paymentStatus === 'failed' ? 'cancelled' : 'pending');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${esc(o.orderNumber)}</strong></td>
                <td>${esc(o.customerName)}<br><small style="color:var(--aff-text-muted);">${esc(o.customerEmail)} | 📞 ${esc(o.phone)}</small></td>
                <td>${esc(o.productName)}</td>
                <td>${esc(o.country)}</td>
                <td>${esc(o.referralCode)}<br><small style="color:var(--aff-text-muted);">${esc(o.affiliateCode)}</small></td>
                <td><span class="aff-badge ${payBadgeClass}">${esc(o.paymentStatus)}</span></td>
                <td><span class="aff-badge ${esc(o.orderStatus)}">${esc(o.orderStatus)}</span></td>
                <td style="font-weight:600;">ETB ${o.orderAmount.toLocaleString()}</td>
                <td>${date}</td>
                <td style="white-space:nowrap;">${actions}</td>
            `;
            tbody.appendChild(row);
        });
    }

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
                <td>${esc(w.method)}<br>${esc(w.phone)}</td>
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

    // Initial load
    renderDashboardStats();

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
            '6': 'campaigns',
            '7': 'announcements'
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
                        <span><kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">1</kbd> to <kbd style="background:var(--aff-bg); padding:2px 6px; border-radius:4px; border:1px solid #ccc; font-weight:600;">7</kbd></span>
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
            const backdrop = document.getElementById('custom-modal-backdrop');
            if (backdrop && backdrop.classList.contains('show')) {
                const cancelBtn = document.getElementById('modal-btn-cancel');
                if (cancelBtn) cancelBtn.click();
            }
        }
    });
});
