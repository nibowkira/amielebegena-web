document.addEventListener("DOMContentLoaded", async () => {
    const escapeHtml = window.AmieleSanitize ? window.AmieleSanitize.escapeHtml : function (str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const currentUser = await (window.AuthGuard ? window.AuthGuard.protectPage({ allowedRoles: ['admin'] }) : window.getCurrentUser());
    if (!currentUser || currentUser.role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    let allOrdersData = [];
    let currentFulfillmentFilter = "all";
    let fulfillmentSearchTerm = "";
    let cachedAnalytics = null;

    // Helper: Update Fulfillment Stage KPI Cards
    function updateFulfillmentKPICards(ordersList, analytics) {
        let prep = 0, craft = 0, packed = 0, shipped = 0, delivered = 0;
        let avgFulfill = "--", avgShip = "--";

        if (analytics && analytics.summaryCards) {
            const sc = analytics.summaryCards;
            prep = sc.ordersPreparing || 0;
            craft = sc.ordersCrafting || 0;
            packed = sc.ordersPacked || 0;
            shipped = sc.ordersShipped || 0;
            delivered = sc.ordersDelivered || 0;
            avgFulfill = sc.avgFulfillmentTime || "0 days";
            avgShip = sc.avgShippingTime || "0 days";
        }

        const sourceOrders = (Array.isArray(ordersList) && ordersList.length > 0) ? ordersList : allOrdersData;
        if (Array.isArray(sourceOrders) && sourceOrders.length > 0) {
            prep = 0; craft = 0; packed = 0; shipped = 0; delivered = 0;
            let totalPackHrs = 0, packCount = 0;
            let totalShipHrs = 0, shipCount = 0;

            sourceOrders.forEach(ord => {
                const stage = (ord.fulfillmentStatus || ord.fulfillment_status || "").trim().toLowerCase();
                const mainSt = (ord.status || "").trim().toLowerCase();

                if (stage === "preparing") prep++;
                else if (stage === "crafting") craft++;
                else if (stage === "packed") packed++;
                else if (stage === "shipped" || (!stage && mainSt === "shipped")) shipped++;
                else if (stage === "delivered" || (!stage && mainSt === "delivered")) delivered++;

                // Pack duration
                if (ord.packed_at && ord.created_at) {
                    const hrs = (new Date(ord.packed_at) - new Date(ord.created_at)) / 3600000;
                    if (hrs >= 0) { totalPackHrs += hrs; packCount++; }
                }
                // Shipping duration
                if (ord.delivered_at && ord.shipped_at) {
                    const hrs = (new Date(ord.delivered_at) - new Date(ord.shipped_at)) / 3600000;
                    if (hrs >= 0) { totalShipHrs += hrs; shipCount++; }
                }
            });

            if (packCount > 0) {
                avgFulfill = (totalPackHrs / packCount < 24) ? Math.round(totalPackHrs / packCount) + " hrs" : (totalPackHrs / packCount / 24).toFixed(1) + " days";
            } else if (analytics && analytics.summaryCards && analytics.summaryCards.avgFulfillmentTime) {
                avgFulfill = analytics.summaryCards.avgFulfillmentTime;
            } else {
                avgFulfill = "0 days";
            }

            if (shipCount > 0) {
                avgShip = (totalShipHrs / shipCount < 24) ? Math.round(totalShipHrs / shipCount) + " hrs" : (totalShipHrs / shipCount / 24).toFixed(1) + " days";
            } else if (analytics && analytics.summaryCards && analytics.summaryCards.avgShippingTime) {
                avgShip = analytics.summaryCards.avgShippingTime;
            } else {
                avgShip = "0 days";
            }
        }

        const elPrep = document.getElementById("card-ful-preparing");
        if (elPrep) elPrep.textContent = prep;

        const elCraft = document.getElementById("card-ful-crafting");
        if (elCraft) elCraft.textContent = craft;

        const elPack = document.getElementById("card-ful-packed");
        if (elPack) elPack.textContent = packed;

        const elShip = document.getElementById("card-ful-shipped");
        if (elShip) elShip.textContent = shipped;

        const elDeliv = document.getElementById("card-ful-delivered");
        if (elDeliv) elDeliv.textContent = delivered;

        const elAvgFul = document.getElementById("card-ful-avg-time");
        if (elAvgFul) elAvgFul.textContent = avgFulfill;

        const elAvgShip = document.getElementById("card-ful-avg-ship-time");
        if (elAvgShip) elAvgShip.textContent = avgShip;
    }

    // Dashboard Analytics Rendering
    async function renderDashboardStats() {
        console.log("[Amiele:Admin] Rendering Comprehensive Analytics Dashboard...");
        const updatedElem = document.getElementById("admin-last-updated");
        if (updatedElem) updatedElem.textContent = "Updating...";

        let analytics = null;
        if (window.AdminService && typeof window.AdminService.getComprehensiveAdminAnalytics === "function") {
            try {
                analytics = await window.AdminService.getComprehensiveAdminAnalytics();
                cachedAnalytics = analytics;
            } catch (err) {
                console.error("[Amiele:Admin] Error fetching analytics:", err);
            }
        }

        if (updatedElem) updatedElem.textContent = "Updated: " + new Date().toLocaleTimeString();
        if (!analytics) {
            console.warn("[Amiele:Admin] Analytics data unavailable or empty.");
            return;
        }

        const sc = analytics.summaryCards || {};

        // Top KPI Cards
        const revElem = document.getElementById("card-total-revenue");
        if (revElem) revElem.textContent = `ETB ${(sc.totalRevenue || 0).toLocaleString()}`;

        const revMonthElem = document.getElementById("card-revenue-month");
        if (revMonthElem) revMonthElem.textContent = `ETB ${(sc.revenueThisMonth || 0).toLocaleString()}`;

        const totOrdersElem = document.getElementById("card-total-orders");
        if (totOrdersElem) totOrdersElem.textContent = (sc.totalOrders || 0).toLocaleString();

        const pendElem = document.getElementById("card-pending-orders");
        if (pendElem) pendElem.textContent = (sc.pendingOrders || 0).toLocaleString();

        const confElem = document.getElementById("card-confirmed-orders");
        if (confElem) confElem.textContent = (sc.confirmedOrders || 0).toLocaleString();

        const shipElem = document.getElementById("card-shipped-orders");
        if (shipElem) shipElem.textContent = (sc.shippedOrders || 0).toLocaleString();

        const delivElem = document.getElementById("card-delivered-orders");
        if (delivElem) delivElem.textContent = (sc.deliveredOrders || 0).toLocaleString();

        const custElem = document.getElementById("card-total-customers");
        if (custElem) custElem.textContent = (sc.totalCustomers || 0).toLocaleString();

        const affElem = document.getElementById("card-total-affiliates");
        if (affElem) affElem.textContent = (sc.totalAffiliates || 0).toLocaleString();

        // Top Affiliate
        const topAffElem = document.getElementById("card-top-affiliate");
        const topAffSub = document.getElementById("card-top-affiliate-sub");
        const insightAffElem = document.getElementById("insight-top-affiliate");
        if (sc.topAffiliate) {
            const name = sc.topAffiliate.name || "N/A";
            if (topAffElem) topAffElem.textContent = name;
            if (insightAffElem) insightAffElem.textContent = name;
            if (topAffSub) topAffSub.textContent = `${sc.topAffiliate.salesCount || 0} Sales • ETB ${(sc.topAffiliate.totalEarnings || 0).toLocaleString()}`;
        }

        // Top Product
        const topProdElem = document.getElementById("card-top-product");
        const topProdSub = document.getElementById("card-top-product-sub");
        const insightProdElem = document.getElementById("insight-best-product");
        if (sc.bestSellingProduct) {
            const name = sc.bestSellingProduct.name || "N/A";
            if (topProdElem) topProdElem.textContent = name;
            if (insightProdElem) insightProdElem.textContent = name;
            if (topProdSub) topProdSub.textContent = `${sc.bestSellingProduct.unitsSold || 0} Units Sold`;
        }

        // AOV
        const aovElem = document.getElementById("card-aov");
        const insightAov = document.getElementById("insight-aov");
        const aovStr = `ETB ${(sc.avgOrderValue || 0).toLocaleString()}`;
        if (aovElem) aovElem.textContent = aovStr;
        if (insightAov) insightAov.textContent = aovStr;

        const insightRevMonth = document.getElementById("insight-revenue-month");
        if (insightRevMonth) insightRevMonth.textContent = `ETB ${(sc.revenueThisMonth || 0).toLocaleString()}`;

        // Monthly Revenue Chart
        const chartElem = document.getElementById("chart-monthly-revenue");
        if (chartElem && analytics.monthlyRevenueData) {
            const data = analytics.monthlyRevenueData;
            const maxRev = Math.max(1, ...data.map(d => d.revenue));
            chartElem.innerHTML = data.map(d => `
                <div class="admin-chart-bar-wrap" style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
                    <div class="admin-chart-bar" style="width:100%; max-width:28px; height:${Math.max(12, Math.round((d.revenue / maxRev) * 100))}%; background:linear-gradient(180deg, #D4AF37, #0F2418); border-radius:4px 4px 0 0;" data-tooltip="ETB ${d.revenue.toLocaleString()} (${d.ordersCount} Orders)"></div>
                    <span class="admin-chart-label" style="color:#667085; font-weight:600; font-size:0.75rem; margin-top:8px;">${escapeHtml(d.month)}</span>
                </div>
            `).join("");
        }

        // Country Distribution
        const countryElem = document.getElementById("container-country-orders");
        if (countryElem && analytics.countryList) {
            const cList = analytics.countryList;
            if (cList.length === 0) {
                countryElem.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="globe" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No country data.</div>';
            } else {
                countryElem.innerHTML = cList.slice(0, 4).map(c => `
                    <div class="admin-progress-row" style="margin-bottom:0.85rem;">
                        <div class="admin-progress-header" style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; font-weight:600; margin-bottom:0.3rem; color:#1C1C1C;">
                            <span><span style="font-size:0.95rem; margin-right:6px;">${c.country === "Ethiopia" ? "🇪🇹" : c.country === "United States" ? "🇺🇸" : c.country === "Canada" ? "🇨🇦" : "🌐"}</span> ${escapeHtml(c.country)}</span>
                            <span style="color:#0F2418; font-weight:700;">${c.count} <span style="color:#667085; font-weight:500; font-size:0.75rem; margin-left:4px;">${c.percentage}%</span></span>
                        </div>
                        <div class="admin-progress-bg" style="background:#F8F6F1; border:1px solid #E7E3D8; height:6px; border-radius:6px; overflow:hidden;">
                            <div class="admin-progress-fill" style="width:${Math.max(5, c.percentage)}%; background:linear-gradient(90deg, #D4AF37, #0F2418); height:100%; border-radius:6px;"></div>
                        </div>
                    </div>
                `).join("");
            }
        }

        // Affiliate Leaderboard
        const leadElem = document.getElementById("container-affiliate-leaderboard");
        if (leadElem && analytics.affiliateLeaderboard) {
            const list = analytics.affiliateLeaderboard;
            if (list.length === 0) {
                leadElem.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="user-x" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No leaderboard data.</div>';
            } else {
                leadElem.innerHTML = list.slice(0, 5).map((a, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #F1F5F9;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:800; color:#FFFFFF; font-size:0.75rem; background:${idx === 0 ? "#D4AF37" : idx === 1 ? "#94A3B8" : idx === 2 ? "#D97706" : "#1C1C1C"}; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${idx + 1}</span>
                            <div style="width:26px; height:26px; border-radius:50%; background:#0F2418; color:#D4AF37; font-weight:700; font-size:0.72rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${(a.name || "AN").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}</div>
                            <div>
                                <div style="font-weight:700; font-size:0.82rem; color:#1C1C1C; line-height:1.2;">${escapeHtml(a.name)}</div>
                                <span style="font-size:0.72rem; color:#667085;">${escapeHtml(a.code || "N/A")}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:#1C1C1C; font-size:0.8rem;">${a.salesCount} Sales</div>
                            <span style="font-size:0.72rem; color:#667085; font-weight:500;">ETB ${a.totalEarnings.toLocaleString()}</span>
                        </div>
                    </div>
                `).join("");
            }
        }

        // Top Products List
        const prodElem = document.getElementById("container-top-products");
        if (prodElem && analytics.topProductsList) {
            const pList = analytics.topProductsList;
            if (pList.length === 0) {
                prodElem.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1rem 0; text-align:center;"><i data-lucide="package-x" style="width:20px; height:20px; color:#D4AF37; margin-bottom:4px;"></i><br>No product sales.</div>';
            } else {
                prodElem.innerHTML = `
                    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; font-size:0.72rem; font-weight:700; color:#667085; text-transform:uppercase; padding-bottom:6px; border-bottom:1px solid #E7E3D8; margin-bottom:8px;">
                        <span>PRODUCT</span>
                        <span style="text-align:center;">UNITS SOLD</span>
                        <span style="text-align:right;">REVENUE</span>
                        <span style="text-align:right;">TREND</span>
                    </div>
                ` + pList.slice(0, 3).map(p => `
                    <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; align-items:center; padding:0.6rem 0; border-bottom:1px solid #F1F5F9;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:34px; height:34px; border-radius:8px; background:rgba(212,175,55,0.12); color:#D4AF37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <i data-lucide="music" style="width:16px; height:16px;"></i>
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:0.84rem; color:#1C1C1C;">${escapeHtml(p.name)}</div>
                                <span style="font-size:0.72rem; color:#667085;">Traditional Instrument</span>
                            </div>
                        </div>
                        <div style="text-align:center; font-weight:700; font-size:0.85rem; color:#1C1C1C;">${p.unitsSold}</div>
                        <div style="text-align:right; font-weight:700; font-size:0.85rem; color:#1C1C1C;">ETB ${p.revenueETB.toLocaleString()}</div>
                        <div style="text-align:right;">
                            <svg width="40" height="20" viewBox="0 0 40 20" fill="none"><path d="M2 16L12 12L22 14L38 4" stroke="#16A34A" stroke-width="2" stroke-linecap="round"/></svg>
                        </div>
                    </div>
                `).join("");
            }
        }

        // Status Analytics Breakdown
        const statElem = document.getElementById("container-status-customer-analytics");
        if (statElem) {
            const ob = analytics.orderStatusBreakdown || {};
            statElem.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#FEF3C7; color:#F59E0B; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="clock" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">PENDING</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${ob.pending || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Awaiting Approval</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#DBEAFE; color:#2563EB; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="check-check" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">CONFIRMED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${ob.confirmed || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Payment Verified</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#DCFCE7; color:#0F2418; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="truck" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">SHIPPED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${ob.shipped || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">In Dispatch</span>
                    </div>

                    <span style="color:#9CA3AF; font-size:1.1rem; font-weight:700;">→</span>

                    <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:14px; padding:12px 10px; text-align:center; flex:1;">
                        <div style="width:32px; height:32px; border-radius:50%; background:#D1FAE5; color:#16A34A; display:flex; align-items:center; justify-content:center; margin:0 auto 6px auto;">
                            <i data-lucide="package-check" style="width:16px; height:16px;"></i>
                        </div>
                        <span style="font-size:0.68rem; font-weight:700; color:#667085; text-transform:uppercase; display:block;">DELIVERED</span>
                        <div style="font-size:1.4rem; font-weight:800; color:#1C1C1C; margin:2px 0;">${ob.delivered || 0}</div>
                        <span style="font-size:0.68rem; color:#667085;">Completed</span>
                    </div>
                </div>
            `;
        }

        // Recent Activity Feed
        const actElem = document.getElementById("container-recent-activity");
        if (actElem && analytics.activityFeed) {
            const feed = analytics.activityFeed;
            if (feed.length === 0) {
                actElem.innerHTML = '<div style="color:#667085; font-size:0.82rem; padding:1.5rem 0; text-align:center;"><i data-lucide="activity" style="width:22px; height:22px; color:#D4AF37; margin-bottom:6px;"></i><br>No recent activity yet.</div>';
            } else {
                actElem.innerHTML = feed.map(item => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:28px; height:28px; border-radius:50%; background:rgba(212,175,55,0.12); color:#D4AF37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <i data-lucide="activity" style="width:14px; height:14px;"></i>
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:0.8rem; color:#1C1C1C;">${escapeHtml(item.title)}</div>
                                <div style="font-size:0.72rem; color:#667085;">${escapeHtml(item.subtitle)}</div>
                            </div>
                        </div>
                        <span style="font-size:0.68rem; color:#9CA3AF; font-weight:500;">${new Date(item.time).toLocaleTimeString()}</span>
                    </div>
                `).join("");
            }
        }

        // Performance Summary Cards (Dynamic)
        if (analytics.performanceSummary) {
            const ps = analytics.performanceSummary;
            const perfGrowth = document.getElementById("stat-perf-growth");
            if (perfGrowth) perfGrowth.textContent = ps.revenueGrowth || "+0%";

            const perfAff = document.getElementById("stat-perf-aff-conv");
            if (perfAff) perfAff.textContent = ps.affiliateConversion || "0%";

            const perfOrd = document.getElementById("stat-perf-order-conv");
            if (perfOrd) perfOrd.textContent = ps.orderConversion || "0%";

            const perfRet = document.getElementById("stat-perf-retention");
            if (perfRet) perfRet.textContent = ps.customerRetention || "0%";
        }

        // Also update the Fulfillment Stage Cards with live stats
        updateFulfillmentKPICards(allOrdersData.length ? allOrdersData : null, analytics);

        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    }

    // Users Management
    async function renderUsers() {
        const tbody = document.getElementById("users-table-body");
        if (!tbody) return;

        let users = [];
        if (window.AdminService) {
            try {
                users = await window.AdminService.getUsers();
            } catch (err) {
                console.error("[Amiele:Admin] Error fetching users:", err);
            }
        }

        tbody.innerHTML = "";
        users.forEach(u => {
            const dateStr = new Date(u.created_at || u.joinedAt || Date.now()).toLocaleDateString();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(u.id.slice(0, 8))}</strong></td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="aff-badge ${u.role === "admin" ? "paid" : u.role === "affiliate" ? "approved" : "pending"}">${escapeHtml(u.role)}</span></td>
                <td>${dateStr}</td>
                <td>
                    <select class="aff-select" style="padding:0.4rem; font-size:0.8rem; width:auto;" onchange="changeUserRole('${escapeHtml(u.id)}', this.value)">
                        <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
                        <option value="affiliate" ${u.role === "affiliate" ? "selected" : ""}>Affiliate</option>
                        <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Applications Management
    async function renderApplications() {
        const tbody = document.getElementById("apps-table-body");
        if (!tbody) return;

        let apps = [];
        if (window.AdminService) {
            try {
                apps = await window.AdminService.getApplications();
            } catch (err) {
                console.error("[Amiele:Admin] Error fetching applications:", err);
            }
        }

        tbody.innerHTML = "";
        const pendingApps = apps.filter(a => a.status === "pending");
        if (pendingApps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No pending applications in queue. / በመጠባበቅ ላይ ያለ ማመልከቻ የለም።</td></tr>';
            return;
        }

        pendingApps.forEach(a => {
            const dateStr = new Date(a.submittedAt).toLocaleDateString();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(a.id)}</strong></td>
                <td>${escapeHtml(a.name)}</td>
                <td>${escapeHtml(a.phone)}<br>${escapeHtml(a.country)}</td>
                <td>
                    ${a.socials.instagram ? `<a href="${escapeHtml(a.socials.instagram)}" target="_blank">Insta</a><br>` : ""}
                    ${a.socials.tiktok ? `<a href="${escapeHtml(a.socials.tiktok)}" target="_blank">TikTok</a><br>` : ""}
                    ${a.socials.youtube ? `<a href="${escapeHtml(a.socials.youtube)}" target="_blank">YouTube</a>` : ""}
                </td>
                <td style="max-width:200px; font-size:0.8rem; color:#555;">${escapeHtml(a.whyApply)}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="approveApp('${escapeHtml(a.userId)}', '${escapeHtml(a.name)}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectApp('${escapeHtml(a.userId)}', '${escapeHtml(a.name)}')">Reject</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (window.AmieleDB && window.AmieleDB.ready) {
        await window.AmieleDB.ready;
    }

    // Switch Admin Tabs
    window.switchAdminTab = function (tabName) {
        document.querySelectorAll(".aff-menu-item").forEach(item => { item.classList.remove("active"); });
        const activeMenuItem = document.querySelector(`.aff-menu-item[onclick*="${tabName}"]`);
        if (activeMenuItem) activeMenuItem.classList.add("active");

        document.querySelectorAll(".aff-tab-pane").forEach(pane => { pane.classList.remove("active"); });
        const activePane = document.getElementById(`tab-${tabName}`);
        if (activePane) activePane.classList.add("active");

        if (window.AuthGuard) window.AuthGuard.syncTabToUrl(tabName, "tab");

        if (tabName === "dashboard") renderDashboardStats();
        else if (tabName === "users") renderUsers();
        else if (tabName === "applications") renderApplications();
        else if (tabName === "commissions") fetchOrders();
        else if (tabName === "withdrawals") renderWithdrawals();
        else if (tabName === "campaigns") renderCampaigns();
        else if (tabName === "announcements") renderAnnouncements();
    };

    window.renderDashboardStats = renderDashboardStats;

    // User Role Modifier
    window.changeUserRole = async function (userId, newRole) {
        const confirmed = await showConfirmModal("Modify User Role", `Are you sure you want to change this user's role to <strong>${newRole}</strong>?`);
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.changeUserRole(userId, newRole);
                showToast(`User role updated to ${newRole}!`, "success");
                renderUsers();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
                renderUsers();
            }
        } else {
            renderUsers();
        }
    };

    // Affiliate Application Handlers
    window.approveApp = async function (userId, name) {
        const confirmed = await showConfirmModal("Approve Affiliate Application", `Are you sure you want to approve the application for <strong>${name}</strong>?`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const admin = await window.getCurrentUser();
                    await window.AdminService.approveApplication(userId, admin.id);
                }
                if (window.AmieleDB) window.AmieleDB.addNotification(userId, "Partnership Approved! 🎉", "Congratulations! Your partnership application has been approved. You are now an active Amiele affiliate.", "announcement");
                showToast("Application approved! User role upgraded to Affiliate.", "success");
                renderApplications();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.rejectApp = async function (userId, name) {
        const confirmed = await showConfirmModal("Reject Affiliate Application", `Are you sure you want to reject the application for <strong>${name}</strong>?`, true);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const admin = await window.getCurrentUser();
                    await window.AdminService.rejectApplication(userId, admin.id);
                }
                if (window.AmieleDB) window.AmieleDB.addNotification(userId, "Application Declined", "Your affiliate application has been declined at this time.", "announcement");
                showToast("Application declined.", "warning");
                renderApplications();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    // Clear Orders
    window.clearAllOrders = async function () {
        const admin = window.getCurrentUser ? await window.getCurrentUser() : null;
        if (!admin || admin.role !== "admin") {
            if (window.showToast) showToast("Access Denied: Admin privileges required.", "error");
            else alert("Access Denied: Admin privileges required.");
            return;
        }

        const confirmed = await showConfirmModal("Clear All Orders", "Are you sure you want to clear all order records from Order Management? This destructive action cannot be undone.", true);
        if (confirmed) {
            try {
                if (window.AdminService && typeof window.AdminService.clearAllOrders === "function") {
                    await window.AdminService.clearAllOrders();
                }
                if (window.showToast) showToast("All order records cleared successfully.", "success");
                else alert("All order records cleared.");
                fetchOrders();
                renderDashboardStats();
            } catch (err) {
                console.error("[Amiele:Admin] clearAllOrders error:", err);
                if (window.showToast) showToast(err.message || "Failed to clear orders.", "error");
                else alert(err.message || "Failed to clear orders.");
            }
        }
    };

    // Orders & Fulfillment Pipeline
    async function fetchOrders() {
        if (window.AdminService) {
            try {
                allOrdersData = await window.AdminService.getOrders();
            } catch (err) {
                console.error("[Amiele:Admin] Error fetching orders:", err);
            }
        }
        updateFulfillmentKPICards(allOrdersData, cachedAnalytics);
        renderOrdersTable();
    }

    function renderOrdersTable() {
        const tbody = document.getElementById("commissions-table-body");
        if (!tbody) return;

        tbody.innerHTML = "";
        if (!allOrdersData || allOrdersData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No orders logged yet.</td></tr>';
            return;
        }

        let filtered = allOrdersData.filter(o => {
            if (currentFulfillmentFilter !== "all") {
                const stage = (o.fulfillmentStatus || "Pending").toLowerCase();
                if (stage !== currentFulfillmentFilter.toLowerCase()) return false;
            }
            if (fulfillmentSearchTerm) {
                const haystack = `${o.orderNumber} ${o.customerName} ${o.customerEmail} ${o.phone} ${o.productName} ${o.country} ${o.affiliateCode}`.toLowerCase();
                if (!haystack.includes(fulfillmentSearchTerm)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2.5rem 0; color: var(--aff-text-muted);">No matching orders found.</td></tr>';
            return;
        }

        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(ord => {
            const dateStr = new Date(ord.createdAt).toLocaleDateString();
            const fulBadge = `<span class="fulfillment-badge ${(ord.fulfillmentStatus || "Pending").toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(ord.fulfillmentStatus || "Pending")}</span>`;
            const payStatus = ord.paymentStatus === "paid" ? "confirmed" : ord.paymentStatus === "failed" ? "cancelled" : "pending";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(ord.orderNumber)}</strong></td>
                <td>${escapeHtml(ord.customerName)}<br><small style="color:var(--aff-text-muted);">${escapeHtml(ord.customerEmail)} | 📞 ${escapeHtml(ord.phone)}</small></td>
                <td>${escapeHtml(ord.productName)}</td>
                <td>${escapeHtml(ord.country)}</td>
                <td>${escapeHtml(ord.referralCode)}<br><small style="color:var(--aff-text-muted);">${escapeHtml(ord.affiliateCode)}</small></td>
                <td><span class="aff-badge ${payStatus}">${escapeHtml(ord.paymentStatus)}</span></td>
                <td>${fulBadge}</td>
                <td style="font-weight:700; color:#0F2418;">ETB ${ord.orderAmount.toLocaleString()}</td>
                <td style="font-size:0.8rem;">${dateStr}</td>
                <td style="text-align:right;">
                    <button class="aff-btn-sm" style="background:#0F2418; color:#FFD700; border:none; border-radius:8px; padding:6px 12px; font-weight:700; font-size:0.75rem; cursor:pointer;" onclick="openOrderFulfillmentModal('${escapeHtml(ord.id)}')">
                        <i data-lucide="eye" style="width:13px; height:13px; vertical-align:middle; margin-right:4px;"></i> Details & Actions
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    }

    // Withdrawals Queue
    async function renderWithdrawals() {
        const tbody = document.getElementById("withdrawals-table-body");
        if (!tbody) return;

        let wths = [];
        if (window.AdminService) {
            try {
                wths = await window.AdminService.getWithdrawals();
            } catch (err) {
                console.error("[Amiele:Admin] Error fetching withdrawals queue:", err);
            }
        }

        tbody.innerHTML = "";
        if (wths.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 3rem 0; color: var(--aff-text-muted);">No withdrawal requests logs.</td></tr>';
            return;
        }

        wths.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(w => {
            const dateStr = new Date(w.createdAt).toLocaleDateString();
            let actionBtn = "-";
            if (w.status === "pending") {
                actionBtn = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#1565c0;" onclick="approveWithdrawal('${escapeHtml(w.rawId)}')">Approve</button>
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#c62828;" onclick="rejectWithdrawal('${escapeHtml(w.rawId)}')">Reject</button>
                `;
            } else if (w.status === "approved") {
                actionBtn = `
                    <button class="aff-btn" style="padding:0.4rem 0.8rem; font-size:0.75rem; background-color:#2e7d32;" onclick="markWithdrawalPaid('${escapeHtml(w.rawId)}')">Mark Paid</button>
                `;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(w.id)}</strong></td>
                <td>${escapeHtml(w.affiliateId)}</td>
                <td style="font-weight:600;">ETB ${w.amount.toLocaleString()}</td>
                <td>${escapeHtml(w.method)}<br>${escapeHtml(w.phone)}</td>
                <td>${dateStr}</td>
                <td><span class="aff-badge ${escapeHtml(w.status)}">${escapeHtml(w.status)}</span></td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    let cachedCampaigns = [];

    // Campaigns
    async function renderCampaigns() {
        const tbody = document.getElementById("campaigns-table-body");
        if (!tbody) return;

        let camps = [];
        const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
        if (client) {
            try {
                const { data, error } = await client.from("affiliate_campaigns").select("*").order("created_at", { ascending: false });
                if (!error && data) camps = data;
            } catch (err) {
                console.error("[Amiele:Admin] Error querying campaigns:", err);
            }
        }
        if (camps.length === 0 && window.AmieleDB && typeof window.AmieleDB.getCampaigns === 'function') {
            camps = window.AmieleDB.getCampaigns();
        }

        cachedCampaigns = camps;
        tbody.innerHTML = "";
        if (camps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--aff-text-muted); padding: 2rem;">No live campaign challenges created yet.</td></tr>`;
            return;
        }

        camps.forEach(c => {
            const end = new Date(c.ends_at || c.endDate || Date.now());
            const diff = Math.max(0, end - new Date());
            const daysLeft = Math.ceil(diff / 86400000);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml((c.id || "").slice(0, 8))}</strong></td>
                <td><strong>${escapeHtml(c.title || "")}</strong></td>
                <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(c.description || '')}">${escapeHtml(c.description || "")}</td>
                <td>${escapeHtml(c.target_sales || c.targetSales || 0)} sales</td>
                <td style="color: var(--aff-primary); font-weight: 600;">ETB ${parseFloat(c.reward || 0).toLocaleString()}</td>
                <td>${daysLeft} days</td>
                <td><span class="aff-badge ${c.status === 'active' ? 'active' : 'pending'}">${escapeHtml(c.status || 'active')}</span></td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="aff-btn-sm" style="background: rgba(212, 175, 55, 0.15); color: #B8860B; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" onclick="openEditCampaignModal('${c.id}')" title="Edit Campaign">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button type="button" class="aff-btn-sm" style="background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" onclick="deleteCampaignAction('${c.id}', '${escapeHtml(c.title || '')}')" title="Delete Campaign">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.openEditCampaignModal = function(id) {
        const camp = cachedCampaigns.find(c => String(c.id) === String(id));
        if (!camp) {
            console.warn('[Amiele:Campaign] Campaign ID not found:', id);
            return;
        }

        const modal = document.getElementById("edit-campaign-modal");
        if (!modal) return;

        const idEl = document.getElementById("edit-cmp-id");
        const titleEl = document.getElementById("edit-cmp-title");
        const descEl = document.getElementById("edit-cmp-desc");
        const targetEl = document.getElementById("edit-cmp-target");
        const rewardEl = document.getElementById("edit-cmp-reward");
        const statusEl = document.getElementById("edit-cmp-status");
        const daysEl = document.getElementById("edit-cmp-days");

        if (idEl) idEl.value = camp.id;
        if (titleEl) titleEl.value = camp.title || "";
        if (descEl) descEl.value = camp.description || "";
        if (targetEl) targetEl.value = camp.target_sales || camp.targetSales || 1;
        if (rewardEl) rewardEl.value = camp.reward || 0;
        if (statusEl) statusEl.value = camp.status || "active";
        if (daysEl) daysEl.value = "";

        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    };

    window.closeEditCampaignModal = function() {
        const modal = document.getElementById("edit-campaign-modal");
        if (modal) {
            modal.classList.remove("show");
            modal.classList.remove("active");
            modal.style.display = "none";
        }
    };

    window.deleteCampaignAction = async function(id, title) {
        const confirmMsg = `Are you sure you want to delete the campaign challenge "${title}"? This action cannot be undone.`;
        if (typeof showConfirmModal === "function") {
            const confirmed = await showConfirmModal("Delete Campaign Challenge", confirmMsg, false, "Delete Campaign");
            if (!confirmed) return;
        } else {
            if (!confirm(confirmMsg)) return;
        }

        try {
            if (window.AdminService && typeof window.AdminService.deleteCampaign === 'function') {
                await window.AdminService.deleteCampaign(id);
            } else {
                try {
                    const local = JSON.parse(localStorage.getItem("amiele_campaigns")) || [];
                    const filtered = local.filter(c => String(c.id) !== String(id));
                    localStorage.setItem("amiele_campaigns", JSON.stringify(filtered));
                } catch(e) {}

                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
                if (isUuid) {
                    const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
                    if (client) {
                        const { error } = await client.from("affiliate_campaigns").delete().eq("id", id);
                        if (error) throw error;
                    }
                }
            }
            if (typeof showToast === 'function') showToast(`Campaign "${title}" deleted successfully!`, "success");
            renderCampaigns();
        } catch (err) {
            console.error("[Amiele:Campaign] Delete error:", err);
            if (typeof showToast === 'function') showToast(err.message || "Failed to delete campaign.", "error");
        }
    };

    // Filter and Search Orders
    window.filterFulfillmentOrders = function (status, btnElem) {
        currentFulfillmentFilter = status;
        document.querySelectorAll(".fulfillment-filter-btn").forEach(b => b.classList.remove("active"));
        if (btnElem) {
            btnElem.classList.add("active");
        } else {
            const targetPill = document.querySelector(`.fulfillment-filter-btn[data-filter='${status}']`);
            if (targetPill) targetPill.classList.add("active");
        }
        renderOrdersTable();
    };

    window.searchFulfillmentOrders = function (term) {
        fulfillmentSearchTerm = (term || "").toLowerCase().trim();
        renderOrdersTable();
    };

    // Automated WhatsApp Message Builder
    window.generateWhatsAppFulfillmentMessage = function (ord, stage, courier = "", tracking = "") {
        const custName = ord.customerName || "Valued Customer";
        const ordNum = ord.orderNumber || "#ORD-0001";
        const courierName = courier || ord.shippingCompany || "DHL Express";
        const trackNum = tracking || ord.trackingNumber || "N/A";

        switch (stage) {
            case "Payment Verified":
                return `Hello ${custName},\n\nWe have received your payment.\nYour order ${ordNum} is now confirmed.\n\nThank you for supporting Ethiopian craftsmanship.`;
            case "Preparing":
                return `Hello ${custName},\n\nOur team has started preparing your handmade instrument.\nWe will keep you updated.`;
            case "Crafting":
                return `Hello ${custName},\n\nYour Begena/Kirar is currently being handcrafted by our artisan.`;
            case "Packed":
                return `Hello ${custName},\n\nYour instrument has been carefully packed and is ready for shipment.`;
            case "Shipped":
                return `Hello ${custName},\n\nGreat news!\nYour order has been shipped.\n\nCourier: ${courierName}\nTracking Number: ${trackNum}\n\nThank you for choosing Amiele Begena.`;
            case "Delivered":
                return `Hello ${custName},\n\nAccording to our records your order has been delivered.\nWe hope you enjoy your handmade instrument.\n\nThank you for supporting Ethiopian craftsmanship.`;
            case "Cancelled":
                return `Hello ${custName},\n\nYour order ${ordNum} has been cancelled.\nPlease contact our support team if you have any questions.`;
            default:
                return `Hello ${custName},\n\nUpdate regarding your order ${ordNum}: Status is currently ${stage}.\n\nThank you for supporting Amiele Begena.`;
        }
    };

    // Order Fulfillment Modal
    window.openOrderFulfillmentModal = function (orderId) {
        const ord = allOrdersData.find(o => o.id === orderId);
        if (!ord) {
            showToast("Order details not found.", "error");
            return;
        }

        const backdrop = document.getElementById("order-details-modal-backdrop");
        const headerNum = document.getElementById("modal-order-number");
        const body = document.getElementById("order-details-modal-body");

        if (headerNum) headerNum.textContent = `Order ${ord.orderNumber}`;

        const stages = ["Pending", "Payment Verified", "Preparing", "Crafting", "Packed", "Shipped", "Delivered"];
        const currentIdx = stages.indexOf(ord.fulfillmentStatus || "Pending");

        let timelineHtml = '<div class="fulfillment-timeline">';
        stages.forEach((st, idx) => {
            let cls = "";
            let iconText = idx + 1;
            let timeStr = "";

            if (ord.fulfillmentStatus === "Cancelled") {
                cls = (idx === 0) ? "completed" : "";
            } else if (idx < currentIdx) {
                cls = "completed";
                iconText = "✓";
            } else if (idx === currentIdx) {
                cls = "current";
                iconText = "●";
            }

            if (ord.history && ord.history.length > 0) {
                const match = ord.history.find(h => h.status === st);
                if (match) {
                    timeStr = new Date(match.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                }
            }

            timelineHtml += `
                <div class="timeline-step ${cls}">
                    <div class="step-icon">${iconText}</div>
                    <div class="step-title">${escapeHtml(st)}</div>
                    <div class="step-time">${escapeHtml(timeStr)}</div>
                </div>
            `;
        });
        timelineHtml += "</div>";

        const previewMsg = generateWhatsAppFulfillmentMessage(ord, ord.fulfillmentStatus || "Payment Verified");
        const cleanPhone = (ord.phone || "").replace(/[^0-9]/g, "");

        body.innerHTML = `
            ${timelineHtml}

            <!-- Customer & Order Information Grid -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="user-check" style="width:16px; height:16px; color:#D4AF37;"></i> Customer & Order Overview
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; font-size:0.82rem;">
                    <div><span style="color:#667085;">Customer Name:</span><br><strong style="color:#0F2418;">${escapeHtml(ord.customerName)}</strong></div>
                    <div><span style="color:#667085;">Phone Number:</span><br><strong>📞 ${escapeHtml(ord.phone)}</strong></div>
                    <div><span style="color:#667085;">Email Address:</span><br><strong>${escapeHtml(ord.customerEmail)}</strong></div>
                    <div><span style="color:#667085;">Delivery Country:</span><br><strong>${escapeHtml(ord.country)}</strong></div>
                    <div><span style="color:#667085;">Product Purchased:</span><br><strong style="color:#0F2418;">${escapeHtml(ord.productName)}</strong></div>
                    <div><span style="color:#667085;">Quantity:</span><br><strong>${escapeHtml(ord.quantity)} Unit(s)</strong></div>
                    <div><span style="color:#667085;">Total Order Value:</span><br><strong style="color:#16A34A; font-size:1rem;">ETB ${ord.orderAmount.toLocaleString()}</strong></div>
                    <div><span style="color:#667085;">Affiliate Referral:</span><br><strong>${escapeHtml(ord.referralCode)} (${escapeHtml(ord.affiliateCode)})</strong></div>
                    <div><span style="color:#667085;">Payment Status:</span><br><span class="aff-badge ${ord.paymentStatus === "paid" ? "confirmed" : "pending"}">${escapeHtml(ord.paymentStatus)}</span></div>
                    <div><span style="color:#667085;">Current Stage:</span><br><span class="fulfillment-badge ${(ord.fulfillmentStatus || "Pending").toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(ord.fulfillmentStatus || "Pending")}</span></div>
                </div>
            </div>

            <!-- Shipping & Tracking Details -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="truck" style="width:16px; height:16px; color:#0F2418;"></i> Shipping & Dispatch Information
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; font-size:0.82rem; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Courier / Shipping Company</label>
                        <input type="text" id="modal-courier-input" value="${escapeHtml(ord.shippingCompany || "")}" placeholder="e.g. DHL Express, FedEx" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Tracking Number</label>
                        <input type="text" id="modal-tracking-input" value="${escapeHtml(ord.trackingNumber || "")}" placeholder="e.g. DHL-98234120" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                    <div>
                        <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Estimated Delivery</label>
                        <input type="text" id="modal-est-delivery-input" value="${escapeHtml(ord.estimatedDelivery || "")}" placeholder="e.g. Aug 5 - Aug 8" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">
                    </div>
                </div>
                <div>
                    <label style="font-weight:700; color:#667085; display:block; margin-bottom:4px;">Shipping & Dispatch Notes</label>
                    <textarea id="modal-shipping-notes" rows="2" placeholder="Packaging requirements, fragile wood handling, artisan signature details..." style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #E7E3D8; font-size:0.82rem;">${escapeHtml(ord.shippingNotes || "")}</textarea>
                </div>
            </div>

            <!-- Fulfillment Action Buttons -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="zap" style="width:16px; height:16px; color:#D4AF37;"></i> Update Order Fulfillment Stage
                </div>
                <div class="fulfillment-actions-grid">
                    <button class="action-btn-stage btn-verify" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Payment Verified')">
                        <i data-lucide="check-check" style="width:14px; height:14px;"></i> Verify Payment
                    </button>
                    <button class="action-btn-stage btn-prepare" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Preparing')">
                        <i data-lucide="scissors" style="width:14px; height:14px;"></i> Start Preparing
                    </button>
                    <button class="action-btn-stage btn-craft" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Crafting')">
                        <i data-lucide="hammer" style="width:14px; height:14px;"></i> Start Crafting
                    </button>
                    <button class="action-btn-stage btn-pack" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Packed')">
                        <i data-lucide="package" style="width:14px; height:14px;"></i> Pack Order
                    </button>
                    <button class="action-btn-stage btn-ship" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Shipped')">
                        <i data-lucide="truck" style="width:14px; height:14px;"></i> Mark Shipped
                    </button>
                    <button class="action-btn-stage btn-deliver" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Delivered')">
                        <i data-lucide="package-check" style="width:14px; height:14px;"></i> Mark Delivered
                    </button>
                    <button class="action-btn-stage btn-cancel" onclick="triggerFulfillmentStageUpdate('${ord.id}', 'Cancelled')">
                        <i data-lucide="x-circle" style="width:14px; height:14px;"></i> Cancel Order
                    </button>
                </div>
            </div>

            <!-- Automated WhatsApp Customer Update -->
            <div class="fulfillment-section-card" style="background:#F0FDF4; border-color:#BBF7D0;">
                <div class="fulfillment-section-title" style="color:#0F2418;">
                    <i data-lucide="message-square" style="width:16px; height:16px; color:#16A34A;"></i> Automated WhatsApp Customer Message
                </div>
                <p style="font-size:0.75rem; color:#667085; margin:0 0 8px 0;">Auto-generated status notification tailored for customer delivery via WhatsApp:</p>
                <textarea id="modal-wa-preview" rows="4" style="width:100%; padding:10px; border-radius:8px; border:1px solid #BBF7D0; font-size:0.8rem; background:#FFFFFF; font-family:monospace; margin-bottom:10px;">${escapeHtml(previewMsg)}</textarea>
                <a id="modal-wa-send-btn" href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(previewMsg)}" target="_blank" class="aff-btn" style="background:#25D366; color:#FFFFFF; border:none; text-decoration:none; font-weight:800; font-size:0.82rem; padding:8px 16px; border-radius:8px; display:inline-flex; align-items:center; gap:8px;">
                    <i class="fa-brands fa-whatsapp" style="font-size:1.1rem;"></i> Send Update via WhatsApp
                </a>
            </div>

            <!-- History Audit Log -->
            <div class="fulfillment-section-card">
                <div class="fulfillment-section-title">
                    <i data-lucide="history" style="width:16px; height:16px; color:#667085;"></i> Order Fulfillment History Log
                </div>
                <div style="max-height:180px; overflow-y:auto; font-size:0.78rem;">
                    ${ord.history && ord.history.length > 0 ? ord.history.map(h => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                            <div>
                                <span class="fulfillment-badge ${(h.status || "").toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(h.status)}</span>
                                <span style="margin-left:8px; color:#1C1C1C; font-weight:600;">${escapeHtml(h.notes || "")}</span>
                            </div>
                            <div style="text-align:right; color:#667085; font-size:0.72rem;">
                                <span>by ${escapeHtml(h.admin_name || "Admin")}</span> • <span>${new Date(h.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join("") : '<div style="color:#667085; text-align:center; padding:10px;">No timeline history logs yet.</div>'}
                </div>
            </div>
        `;

        backdrop.classList.add("show");
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    };

    window.closeOrderFulfillmentModal = function () {
        const backdrop = document.getElementById("order-details-modal-backdrop");
        if (backdrop) backdrop.classList.remove("show");
    };

    // Update Fulfillment Status Action
    window.triggerFulfillmentStageUpdate = async function (orderId, targetStage) {
        const courier = document.getElementById("modal-courier-input") ? document.getElementById("modal-courier-input").value.trim() : "";
        const tracking = document.getElementById("modal-tracking-input") ? document.getElementById("modal-tracking-input").value.trim() : "";
        const estDelivery = document.getElementById("modal-est-delivery-input") ? document.getElementById("modal-est-delivery-input").value.trim() : "";
        const notes = document.getElementById("modal-shipping-notes") ? document.getElementById("modal-shipping-notes").value.trim() : "";

        try {
            const admin = await window.getCurrentUser();
            await window.AdminService.updateFulfillmentStatus(
                orderId,
                targetStage,
                { tracking_number: tracking, shipping_company: courier, shipping_notes: notes, estimated_delivery: estDelivery },
                notes || `Order stage updated to ${targetStage}`,
                admin
            );

            showToast(`Order status updated to ${targetStage}!`, "success");

            // Refresh orders and update metric cards
            allOrdersData = await window.AdminService.getOrders();
            updateFulfillmentKPICards(allOrdersData, null);
            renderOrdersTable();
            renderDashboardStats();
            openOrderFulfillmentModal(orderId);
        } catch (err) {
            showToast(err.message || "Failed to update fulfillment status", "error");
        }
    };

    window.approveOrderPayment = async function (orderId, orderNum) {
        const confirmed = await showConfirmModal("Approve Payment", `Approve payment for order <strong>${orderNum}</strong>? This will calculate and credit the affiliate commission automatically.`);
        if (confirmed) {
            try {
                if (window.AdminService) {
                    const res = await window.AdminService.approvePayment(orderId);
                    if (res && res.commission_attributed) {
                        showToast(`Payment approved! Commission of ETB ${Math.round(res.commission_amount).toLocaleString()} credited to affiliate.`, "success");
                    } else {
                        showToast("Payment approved! (No affiliate referral on this order)", "success");
                    }
                }
                fetchOrders();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.rejectOrderPayment = async function (orderId, orderNum) {
        const confirmed = await showConfirmModal("Reject Payment", `Reject payment for order <strong>${orderNum}</strong>? The order will be cancelled.`, true);
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.rejectPayment(orderId);
                showToast("Payment rejected. Order cancelled.", "warning");
                fetchOrders();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.cancelOrder = async function (orderId) {
        const confirmed = await showConfirmModal("Cancel Order", "Are you sure you want to cancel this order?", true);
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.updateOrderStatus(orderId, "cancelled");
                showToast("Order cancelled.", "warning");
                fetchOrders();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.markOrderShipped = async function (orderId) {
        try {
            if (window.AdminService) await window.AdminService.updateOrderStatus(orderId, "shipped");
            showToast("Order marked as shipped!", "success");
            fetchOrders();
            renderDashboardStats();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    window.markOrderDelivered = async function (orderId) {
        try {
            if (window.AdminService) await window.AdminService.updateOrderStatus(orderId, "delivered");
            showToast("Order marked as delivered!", "success");
            fetchOrders();
            renderDashboardStats();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // Withdrawal Actions
    window.approveWithdrawal = async function (id) {
        const confirmed = await showConfirmModal("Approve Withdrawal Request", "Approve payout request?");
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.updateWithdrawalStatus(id, "approved", currentUser.id);
                showToast("Withdrawal request approved!", "success");
                renderWithdrawals();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.rejectWithdrawal = async function (id) {
        const confirmed = await showConfirmModal("Reject Withdrawal Request", "Are you sure you want to decline this request? Funds will return to affiliate balance.", true);
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.updateWithdrawalStatus(id, "rejected", currentUser.id);
                showToast("Withdrawal rejected.", "warning");
                renderWithdrawals();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    window.markWithdrawalPaid = async function (id) {
        const confirmed = await showConfirmModal("Mark Withdrawal as PAID", "Mark request as successfully paid to partner?");
        if (confirmed) {
            try {
                if (window.AdminService) await window.AdminService.updateWithdrawalStatus(id, "paid", currentUser.id);
                showToast("Withdrawal marked as PAID successfully.", "success");
                renderWithdrawals();
                renderDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        }
    };

    // Announcements
    async function renderAnnouncements() {
        const tbody = document.getElementById("ann-table-body");
        if (!tbody) return;

        let anns = [];
        const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
        if (client) {
            try {
                const { data, error } = await client.from("affiliate_announcements").select("*").order("created_at", { ascending: false });
                if (!error && data) anns = data;
            } catch (err) {
                console.error("[Amiele:Admin] Error querying announcements:", err);
            }
        }

        tbody.innerHTML = "";
        anns.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(a.id.slice(0, 8))}</strong></td>
                <td>${escapeHtml(a.title)}</td>
                <td>${escapeHtml(a.content)}</td>
                <td><span class="aff-badge approved">${escapeHtml(a.type)}</span></td>
                <td><span class="aff-badge ${a.urgency === "high" || a.urgency === "critical" ? "rejected" : "pending"}">${escapeHtml(a.urgency)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Forms
    const campForm = document.getElementById("create-campaign-form");
    if (campForm) {
        campForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById("cmp-title").value.trim();
            const desc = document.getElementById("cmp-desc").value.trim();
            const target = parseInt(document.getElementById("cmp-target").value, 10);
            const reward = parseFloat(document.getElementById("cmp-reward").value);
            const days = parseInt(document.getElementById("cmp-days").value, 10);

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            const submitBtn = campForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Creating...";

            try {
                if (window.AdminService) await window.AdminService.createCampaign(title, desc, target, reward, endDate.toISOString(), currentUser.id);
                showToast("Bonus campaign challenge created successfully!", "success");
                campForm.reset();
                renderCampaigns();
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = origText;
            }
        });
    }

    const editCampForm = document.getElementById("edit-campaign-form");
    if (editCampForm) {
        editCampForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("edit-cmp-id").value;
            const title = document.getElementById("edit-cmp-title").value.trim();
            const desc = document.getElementById("edit-cmp-desc").value.trim();
            const target = parseInt(document.getElementById("edit-cmp-target").value, 10);
            const reward = parseFloat(document.getElementById("edit-cmp-reward").value);
            const status = document.getElementById("edit-cmp-status").value;
            const extraDays = document.getElementById("edit-cmp-days").value ? parseInt(document.getElementById("edit-cmp-days").value, 10) : null;

            const updates = {
                title,
                description: desc,
                target_sales: target,
                reward,
                status
            };

            if (extraDays && extraDays > 0) {
                const newEnd = new Date();
                newEnd.setDate(newEnd.getDate() + extraDays);
                updates.ends_at = newEnd.toISOString();
            }

            const submitBtn = editCampForm.querySelector('button[type="submit"]');
            const origText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                if (window.AdminService && typeof window.AdminService.updateCampaign === "function") {
                    await window.AdminService.updateCampaign(id, updates);
                } else {
                    const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
                    if (client) {
                        const { error } = await client.from("affiliate_campaigns").update(updates).eq("id", id);
                        if (error) throw error;
                    }
                }
                if (typeof showToast === "function") showToast("Campaign challenge updated successfully!", "success");
                window.closeEditCampaignModal();
                renderCampaigns();
            } catch (err) {
                console.error("[Amiele:Campaign] Update error:", err);
                if (typeof showToast === "function") showToast(err.message || "Failed to update campaign.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
            }
        });
    }

    const annForm = document.getElementById("create-ann-form");
    if (annForm) {
        annForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById("ann-title").value.trim();
            const content = document.getElementById("ann-content").value.trim();
            const type = document.getElementById("ann-type").value;
            const urgency = document.getElementById("ann-urgency").value;

            const submitBtn = annForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Publishing...";

            try {
                if (window.AdminService) await window.AdminService.createAnnouncement(title, content, type, urgency, currentUser.id);
                showToast("Announcement broadcasted successfully!", "success");
                annForm.reset();
                renderAnnouncements();
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = origText;
            }
        });
    }

    // Initial Tab Navigation
    const initTab = window.AuthGuard ? window.AuthGuard.getInitialTab("dashboard") : "dashboard";
    window.switchAdminTab(initTab);

    // Initial background load of orders data so cards populate immediately
    fetchOrders();

    window.addEventListener("popstate", function () {
        const t = window.AuthGuard ? window.AuthGuard.getInitialTab("dashboard") : "dashboard";
        window.switchAdminTab(t);
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
        if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;

        const tabMap = {
            "1": "dashboard",
            "2": "users",
            "3": "applications",
            "4": "commissions",
            "5": "withdrawals",
            "6": "campaigns",
            "7": "announcements"
        };

        if (tabMap[e.key]) {
            e.preventDefault();
            window.switchAdminTab(tabMap[e.key]);
            return;
        }

        if (e.key === "?") {
            e.preventDefault();
            showConfirmModal("Admin Shortcut Directory", `
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
            `, false, "Close Helper");
            return;
        }

        if (e.key === "Escape") {
            if (window.closeOrderFulfillmentModal) window.closeOrderFulfillmentModal();
            const modalBackdrop = document.getElementById("custom-modal-backdrop");
            if (modalBackdrop && modalBackdrop.classList.contains("show")) {
                const cancelBtn = document.getElementById("modal-btn-cancel");
                if (cancelBtn) cancelBtn.click();
            }
        }
    });
});