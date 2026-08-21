!(function () {
    "use strict";

    function getETBPrice(product, quantity = 1) {
        if (!product) return 0;
        let price = parseFloat(product.price || 0);
        if (price <= 0) return 0;
        
        let currency = product.currency || (price < 500 ? "USD" : "ETB");
        let etbRate = (window.exchangeRates && window.exchangeRates.ETB && window.exchangeRates.ETB.rate)
            ? window.exchangeRates.ETB.rate
            : 105.8871;
        
        let unitPriceInETB = (currency === "USD") ? Math.round(price * etbRate) : price;
        return unitPriceInETB * (quantity || 1);
    }

    const AdminService = {
        async getAdminAnalytics() {
            return await this.getComprehensiveAdminAnalytics();
        },

        async getComprehensiveAdminAnalytics() {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) return null;

            try {
                const [
                    { data: ordersData },
                    { data: productsData },
                    { data: affiliatesData },
                    { data: commissionsData },
                    { data: clicksData },
                    { data: withdrawalsData },
                    { data: profilesData }
                ] = await Promise.all([
                    supabase.from("orders").select("id, order_number, quantity, status, payment_status, country, customer_name, customer_email, phone, created_at, product_id, referral_code, affiliate_id, product:products(name, price, currency)").order("created_at", { ascending: false }),
                    supabase.from("products").select("id, name, price, currency, category"),
                    supabase.from("affiliates").select("user_id, referral_code, sales_count, created_at, profile:profiles(full_name, email)"),
                    supabase.from("commissions").select("id, amount, status, created_at, order_id, affiliate_id"),
                    supabase.from("affiliate_clicks").select("id, created_at, referral_code, affiliate_id, user_agent").order("created_at", { ascending: false }).limit(100),
                    supabase.from("affiliate_withdrawals").select("id, amount, status, created_at, affiliate_id").order("created_at", { ascending: false }),
                    supabase.from("profiles").select("id, full_name, email, role, created_at")
                ]);

                const orders = ordersData || [];
                const affiliates = affiliatesData || [];
                const commissions = commissionsData || [];
                const clicks = clicksData || [];
                const withdrawals = withdrawalsData || [];
                const profiles = profilesData || [];

                let totalRevenue = 0;
                let revenueThisMonth = 0;
                let pendingOrdersCount = 0;
                let confirmedOrdersCount = 0;
                let shippedOrdersCount = 0;
                let deliveredOrdersCount = 0;
                let cancelledOrdersCount = 0;
                let countPreparing = 0;
                let countCrafting = 0;
                let countPacked = 0;
                let countShipped = 0;
                let countDelivered = 0;
                let countCancelled = 0;

                let totalPackHours = 0;
                let packCount = 0;
                let totalShipHours = 0;
                let shipCount = 0;

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                const productStats = {};
                const countryCounts = {};
                const uniqueCustomerKeys = new Set();
                const customerOrderCounts = {};

                orders.forEach(ord => {
                    const orderETB = getETBPrice(ord.product, ord.quantity || 1);
                    const createdAtTime = new Date(ord.created_at).getTime();
                    const isRevenueOrder = ord.payment_status === "paid" || ["confirmed", "shipped", "delivered"].includes((ord.status || "").toLowerCase());
                    
                    if (isRevenueOrder) {
                        totalRevenue += orderETB;
                        if (createdAtTime >= startOfMonth) {
                            revenueThisMonth += orderETB;
                        }
                    }

                    const mainStatus = (ord.status || "pending").toLowerCase();
                    if (mainStatus === "confirmed") confirmedOrdersCount++;
                    else if (mainStatus === "shipped") shippedOrdersCount++;
                    else if (mainStatus === "delivered") deliveredOrdersCount++;
                    else if (mainStatus === "cancelled") cancelledOrdersCount++;
                    else pendingOrdersCount++;

                    const rawStage = (ord.fulfillment_status || "").trim().toLowerCase();
                    if (rawStage === "preparing") countPreparing++;
                    else if (rawStage === "crafting") countCrafting++;
                    else if (rawStage === "packed") countPacked++;
                    else if (rawStage === "shipped" || (!rawStage && mainStatus === "shipped")) countShipped++;
                    else if (rawStage === "delivered" || (!rawStage && mainStatus === "delivered")) countDelivered++;
                    else if (rawStage === "cancelled" || (!rawStage && mainStatus === "cancelled")) countCancelled++;

                    if (ord.packed_at && ord.created_at) {
                        const hrs = (new Date(ord.packed_at) - new Date(ord.created_at)) / 3600000;
                        if (hrs >= 0) { totalPackHours += hrs; packCount++; }
                    }
                    if (ord.delivered_at && ord.shipped_at) {
                        const hrs = (new Date(ord.delivered_at) - new Date(ord.shipped_at)) / 3600000;
                        if (hrs >= 0) { totalShipHours += hrs; shipCount++; }
                    }

                    const countryName = (ord.country && ord.country !== "N/A") ? ord.country.trim() : "Ethiopia";
                    countryCounts[countryName] = (countryCounts[countryName] || 0) + 1;

                    const prodName = ord.product ? ord.product.name : (ord.product_name || "Ethiopian Begena");
                    if (!productStats[prodName]) productStats[prodName] = { unitsSold: 0, revenueETB: 0 };
                    productStats[prodName].unitsSold += (ord.quantity || 1);
                    if (isRevenueOrder) { productStats[prodName].revenueETB += orderETB; }

                    const custKey = (ord.customer_email && ord.customer_email !== "N/A")
                        ? ord.customer_email.toLowerCase()
                        : (ord.phone || ord.customer_name || "guest");
                    uniqueCustomerKeys.add(custKey);
                    customerOrderCounts[custKey] = (customerOrderCounts[custKey] || 0) + 1;
                });

                const totalOrdersCount = orders.length;
                const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
                const totalCustomersCount = Math.max(uniqueCustomerKeys.size, profiles.filter(p => p.role === "customer").length);
                const totalAffiliatesCount = Math.max(affiliates.length, profiles.filter(p => p.role === "affiliate").length);

                const affiliateEarningsMap = {};
                commissions.forEach(c => {
                    if (c.status === "approved" && c.affiliate_id) {
                        affiliateEarningsMap[c.affiliate_id] = (affiliateEarningsMap[c.affiliate_id] || 0) + parseFloat(c.amount || 0);
                    }
                });

                let topAffiliate = { name: "N/A", referralCode: "N/A", salesCount: 0, totalEarnings: 0 };
                let maxSales = -1;
                affiliates.forEach(aff => {
                    const earnings = affiliateEarningsMap[aff.user_id] || 0;
                    const sales = Math.max(aff.sales_count || 0, orders.filter(o => o.affiliate_id === aff.user_id && ["paid", "confirmed"].includes((o.payment_status || o.status || "").toLowerCase())).length);
                    if (sales > maxSales) {
                        maxSales = sales;
                        const name = aff.profile ? aff.profile.full_name : (aff.referral_code || "Partner");
                        topAffiliate = { name, referralCode: aff.referral_code || "N/A", salesCount: sales, totalEarnings: earnings };
                    }
                });

                let bestSellingProduct = { name: "N/A", unitsSold: 0, revenueETB: 0 };
                let maxUnits = -1;
                Object.keys(productStats).forEach(pName => {
                    if (productStats[pName].unitsSold > maxUnits) {
                        maxUnits = productStats[pName].unitsSold;
                        bestSellingProduct = { name: pName, unitsSold: productStats[pName].unitsSold, revenueETB: productStats[pName].revenueETB };
                    }
                });

                const monthlyRevenueData = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
                    const monthStart = d.getTime();
                    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();

                    let monthRev = 0;
                    let monthOrders = 0;
                    orders.forEach(ord => {
                        const tTime = new Date(ord.created_at).getTime();
                        if (tTime >= monthStart && tTime < monthEnd) {
                            monthOrders++;
                            if (ord.payment_status === "paid" || ["confirmed", "shipped", "delivered"].includes((ord.status || "").toLowerCase())) {
                                monthRev += getETBPrice(ord.product, ord.quantity || 1);
                            }
                        }
                    });
                    monthlyRevenueData.push({ month: monthLabel, revenue: Math.round(monthRev), ordersCount: monthOrders });
                }

                const countryList = Object.keys(countryCounts).map(c => ({
                    country: c,
                    count: countryCounts[c],
                    percentage: totalOrdersCount > 0 ? Math.round((countryCounts[c] / totalOrdersCount) * 100) : 0
                })).sort((a, b) => b.count - a.count);

                const affiliateLeaderboard = affiliates.map(aff => {
                    const name = aff.profile ? aff.profile.full_name : (aff.referral_code || "Affiliate Partner");
                    const totalEarnings = affiliateEarningsMap[aff.user_id] || 0;
                    const salesCount = Math.max(aff.sales_count || 0, orders.filter(o => o.affiliate_id === aff.user_id && ["paid", "confirmed"].includes((o.payment_status || o.status || "").toLowerCase())).length);
                    return { userId: aff.user_id, name, code: aff.referral_code, salesCount, totalEarnings };
                }).sort((a, b) => b.salesCount - a.salesCount).slice(0, 10);

                const topProductsList = Object.keys(productStats).map(pName => ({
                    name: pName,
                    unitsSold: productStats[pName].unitsSold,
                    revenueETB: productStats[pName].revenueETB
                })).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10);

                let repeatCount = 0;
                Object.values(customerOrderCounts).forEach(cnt => { if (cnt > 1) repeatCount++; });
                const customerAnalytics = {
                    totalCustomers: totalCustomersCount,
                    repeatCustomers: repeatCount,
                    repeatRate: uniqueCustomerKeys.size > 0 ? Math.round((repeatCount / uniqueCustomerKeys.size) * 100) : 0,
                    avgCustomerSpend: totalCustomersCount > 0 ? Math.round(totalRevenue / totalCustomersCount) : 0
                };

                const activityFeed = [];
                orders.slice(0, 5).forEach(ord => {
                    activityFeed.push({
                        type: "order",
                        icon: "fa-shopping-cart",
                        color: "#2e7d32",
                        title: `New Order (${ord.order_number || "#" + ord.id.slice(0, 4)})`,
                        subtitle: `${ord.customer_name || "Customer"} placed order for ${ord.product ? ord.product.name : "Begena"}`,
                        time: ord.created_at
                    });
                });
                clicks.slice(0, 5).forEach(clk => {
                    activityFeed.push({
                        type: "click",
                        icon: "fa-mouse-pointer",
                        color: "#0288d1",
                        title: "Referral Link Clicked",
                        subtitle: `Code: ${clk.referral_code || "General"}`,
                        time: clk.created_at
                    });
                });
                withdrawals.slice(0, 5).forEach(wth => {
                    activityFeed.push({
                        type: "payout",
                        icon: "fa-hand-holding-usd",
                        color: "#ed6c02",
                        title: `Payout Request (${(wth.status || "").toUpperCase()})`,
                        subtitle: `ETB ${parseFloat(wth.amount).toLocaleString()} via ${wth.method}`,
                        time: wth.created_at
                    });
                });
                activityFeed.sort((a, b) => new Date(b.time) - new Date(a.time));

                // Calculate performance summary metrics
                const thisMonthRev = monthlyRevenueData[monthlyRevenueData.length - 1]?.revenue || 0;
                const lastMonthRev = monthlyRevenueData[monthlyRevenueData.length - 2]?.revenue || 0;
                let revGrowthPct = 0;
                if (lastMonthRev > 0) {
                    revGrowthPct = Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100);
                } else if (thisMonthRev > 0) {
                    revGrowthPct = 100;
                }

                const totalClicksCount = clicks.length;
                const totalPaidOrders = orders.filter(o => o.payment_status === "paid" || ["confirmed", "shipped", "delivered"].includes((o.status || "").toLowerCase())).length;
                const affConvRate = totalClicksCount > 0 ? Math.round((totalPaidOrders / totalClicksCount) * 100) : 0;
                const orderConvRate = totalOrdersCount > 0 ? Math.round((totalPaidOrders / totalOrdersCount) * 100) : 0;
                const retRate = customerAnalytics.repeatRate || 0;

                const performanceSummary = {
                    revenueGrowth: (revGrowthPct >= 0 ? "+" : "") + revGrowthPct + "%",
                    affiliateConversion: affConvRate + "%",
                    orderConversion: orderConvRate + "%",
                    customerRetention: retRate + "%"
                };

                return {
                    summaryCards: {
                        totalRevenue: Math.round(totalRevenue),
                        revenueThisMonth: Math.round(revenueThisMonth),
                        totalOrders: totalOrdersCount,
                        pendingOrders: pendingOrdersCount,
                        confirmedOrders: confirmedOrdersCount,
                        shippedOrders: shippedOrdersCount,
                        deliveredOrders: deliveredOrdersCount,
                        ordersPreparing: countPreparing,
                        ordersCrafting: countCrafting,
                        ordersPacked: countPacked,
                        ordersShipped: countShipped || shippedOrdersCount,
                        ordersDelivered: countDelivered || deliveredOrdersCount,
                        ordersCancelled: countCancelled || cancelledOrdersCount,
                        avgFulfillmentTime: packCount > 0 ? (totalPackHours / packCount < 24 ? Math.round(totalPackHours / packCount) + " hrs" : (totalPackHours / packCount / 24).toFixed(1) + " days") : "--",
                        avgShippingTime: shipCount > 0 ? (totalShipHours / shipCount < 24 ? Math.round(totalShipHours / shipCount) + " hrs" : (totalShipHours / shipCount / 24).toFixed(1) + " days") : "--",
                        totalCustomers: totalCustomersCount,
                        totalAffiliates: totalAffiliatesCount,
                        topAffiliate,
                        bestSellingProduct,
                        avgOrderValue
                    },
                    performanceSummary,
                    monthlyRevenueData,
                    countryList,
                    affiliateLeaderboard,
                    topProductsList,
                    customerAnalytics,
                    activityFeed: activityFeed.slice(0, 15),
                    orderStatusBreakdown: {
                        pending: pendingOrdersCount,
                        confirmed: confirmedOrdersCount,
                        shipped: shippedOrdersCount,
                        delivered: deliveredOrdersCount,
                        cancelled: cancelledOrdersCount
                    }
                };
            } catch (err) {
                console.error("[Amiele:Admin] Error in getComprehensiveAdminAnalytics:", err);
                return null;
            }
        },

        async getUsers() {
            let remoteUsers = [];
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (supabase) {
                try {
                    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
                    if (!error && data) remoteUsers = data;
                } catch (e) {
                    console.error("[Amiele:Admin] Supabase fetch users error:", e);
                }
            }
            let localUsers = [];
            if (window.AmieleDB) {
                try { localUsers = window.AmieleDB.getUsers(); } catch (e) { console.error("[Amiele:Admin] Local users fetch error:", e); }
            }

            const mappedLocal = localUsers.map(u => ({
                id: u.id,
                full_name: u.name,
                email: u.email,
                role: u.role,
                created_at: u.joinedAt || new Date().toISOString()
            }));

            const userMap = new Map();
            mappedLocal.forEach(u => userMap.set(u.id, u));
            remoteUsers.forEach(u => userMap.set(u.id, u));

            return Array.from(userMap.values()).map(u => ({
                id: u.id,
                name: u.full_name || u.name || "User",
                email: u.email,
                role: u.role,
                created_at: u.created_at
            }));
        },

        async changeUserRole(userId, newRole) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            let success = false;
            if (supabase) {
                try {
                    const { data, error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId).select().single();
                    if (!error) success = true;
                } catch (e) {
                    console.warn("[Amiele:Admin] Supabase role update failed:", e);
                }
            }
            if (window.AmieleDB) {
                try {
                    const users = window.AmieleDB.getUsers();
                    const idx = users.findIndex(u => u.id === userId);
                    if (idx !== -1) {
                        users[idx].role = newRole;
                        window.AmieleDB.saveUsers(users);
                    }
                } catch (e) {
                    console.error("[Amiele:Admin] Local role update failed:", e);
                }
            }
            if (supabase && !success && !window.AmieleDB) {
                throw new Error("Could not update user role.");
            }
        },

        async getApplications() {
            let mappedApps = [];
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (supabase) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) console.warn("[Amiele:Admin] No active auth session. RLS will block application reads!");
                } catch (e) {
                    console.warn("[Amiele:Admin] Could not verify auth session status:", e);
                }

                let appsData = [];
                try {
                    const { data, error } = await supabase.from("affiliate_applications").select("*").order("created_at", { ascending: false });
                    if (error) console.error("[Amiele:Admin] Supabase applications query error:", error.message, error);
                    else if (data) appsData = data;
                } catch (e) {
                    console.error("[Amiele:Admin] Supabase applications fetch exception:", e);
                }

                let profileMap = {};
                if (appsData.length > 0) {
                    try {
                        const userIds = appsData.map(a => a.user_id);
                        const { data: profiles, error } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
                        if (!error && profiles) {
                            profiles.forEach(p => { profileMap[p.id] = p; });
                        }
                    } catch (e) {
                        console.error("[Amiele:Admin] Supabase profiles fetch exception:", e);
                    }
                }

                mappedApps = appsData.map(a => {
                    const p = profileMap[a.user_id];
                    return {
                        id: "app_" + a.user_id.slice(0, 8),
                        userId: a.user_id,
                        name: p ? p.full_name : "Unknown User",
                        phone: "N/A",
                        country: "ET",
                        socials: {
                            instagram: a.social_link && a.social_link.includes("instagram") ? a.social_link : "",
                            tiktok: a.social_link && a.social_link.includes("tiktok") ? a.social_link : "",
                            youtube: a.social_link && a.social_link.includes("youtube") ? a.social_link : ""
                        },
                        whyApply: a.motivation,
                        status: a.status,
                        submittedAt: a.created_at
                    };
                });
            }

            let localApps = [];
            if (window.AmieleDB) {
                try {
                    localApps = window.AmieleDB.getApplications().map(a => ({
                        id: a.id,
                        userId: a.userId,
                        name: a.name || "Unknown User",
                        phone: a.phone || "N/A",
                        country: a.country || "ET",
                        socials: {
                            instagram: a.socials && a.socials.instagram ? a.socials.instagram : "",
                            tiktok: a.socials && a.socials.tiktok ? a.socials.tiktok : "",
                            youtube: a.socials && a.socials.youtube ? a.socials.youtube : ""
                        },
                        whyApply: a.whyApply || "",
                        status: a.status || "pending",
                        submittedAt: a.submittedAt || new Date().toISOString()
                    }));
                } catch (e) {
                    console.error("[Amiele:Admin] Local applications fetch error:", e);
                }
            }

            const merged = new Map();
            localApps.forEach(a => merged.set(a.userId, a));
            mappedApps.forEach(a => merged.set(a.userId, a));
            return Array.from(merged.values());
        },

        async approveApplication(userId, reviewerId) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            let success = false;
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from("affiliate_applications")
                        .update({ status: "approved", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
                        .eq("user_id", userId)
                        .select()
                        .single();
                    if (!error) success = true;
                } catch (e) {
                    console.error("[Amiele:Admin] Supabase approve application failed:", e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const apps = window.AmieleDB.getApplications();
                    const app = apps.find(a => a.userId === userId || a.id === userId);
                    if (app) {
                        app.status = "approved";
                        app.reviewedAt = new Date().toISOString();
                        window.AmieleDB.saveApplications(apps);

                        const users = window.AmieleDB.getUsers();
                        const u = users.find(x => x.id === app.userId);
                        if (u) {
                            u.role = "affiliate";
                            window.AmieleDB.saveUsers(users);
                        }

                        const affs = window.AmieleDB.getAffiliates();
                        if (!affs.find(x => x.userId === app.userId)) {
                            const codePrefix = app.name ? app.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) : "AFF";
                            const codeRand = Math.floor(10 + 90 * Math.random());
                            affs.push({
                                userId: app.userId,
                                code: codePrefix + codeRand,
                                couponCode: codePrefix + "5",
                                balance: 0,
                                totalEarnings: 0,
                                pendingCommission: 0,
                                totalPaid: 0,
                                clicks: 0,
                                sales: 0,
                                tier: "standard"
                            });
                            window.AmieleDB.saveAffiliates(affs);
                        }
                    }
                } catch (e) {
                    console.error("[Amiele:Admin] Local approve application failed:", e);
                }
            }

            if (supabase && !success && !window.AmieleDB) {
                throw new Error("Could not approve application.");
            }
        },

        async rejectApplication(userId, reviewerId) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            let success = false;
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from("affiliate_applications")
                        .update({ status: "rejected", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
                        .eq("user_id", userId)
                        .select()
                        .single();
                    if (!error) success = true;
                } catch (e) {
                    console.error("[Amiele:Admin] Supabase reject application failed:", e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const apps = window.AmieleDB.getApplications();
                    const app = apps.find(a => a.userId === userId || a.id === userId);
                    if (app) {
                        app.status = "rejected";
                        app.reviewedAt = new Date().toISOString();
                        window.AmieleDB.saveApplications(apps);
                    }
                } catch (e) {
                    console.error("[Amiele:Admin] Local reject application failed:", e);
                }
            }

            if (supabase && !success && !window.AmieleDB) {
                throw new Error("Could not reject application.");
            }
        },

        async getReferredSales() {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) return [];

            const { data, error } = await supabase
                .from("orders")
                .select("id, quantity, status, created_at, affiliate_id, product:products(name, price, currency)")
                .not("affiliate_id", "is", null)
                .order("created_at", { ascending: false });
            if (error) throw error;

            const { data: affs, error: affErr } = await supabase.from("affiliates").select("user_id, referral_code");
            const codeMap = {};
            if (!affErr && affs) {
                affs.forEach(a => { codeMap[a.user_id] = a.referral_code; });
            }

            return data.map(ord => {
                const totalETB = getETBPrice(ord.product, ord.quantity || 1);
                const commETB = Math.round(totalETB * 0.08);
                return {
                    id: ord.id,
                    affiliateId: codeMap[ord.affiliate_id] || ord.affiliate_id,
                    orderId: "#HA-" + ord.id.slice(0, 4).toUpperCase(),
                    productName: ord.product ? `${ord.quantity}x ${ord.product.name}` : "Instrument",
                    orderAmount: totalETB,
                    commissionAmount: commETB,
                    status: ord.status,
                    createdAt: ord.created_at
                };
            });
        },

        async getOrders() {
            let orderList = [];
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (supabase) {
                try {
                    const { data, error } = await supabase.from("orders").select(`
                        id,
                        order_number,
                        customer_name,
                        customer_email,
                        phone,
                        country,
                        referral_code,
                        quantity,
                        status,
                        payment_status,
                        fulfillment_status,
                        tracking_number,
                        shipping_company,
                        shipping_notes,
                        estimated_delivery,
                        packed_at,
                        shipped_at,
                        delivered_at,
                        last_status_update,
                        created_at,
                        affiliate_id,
                        product:products(name, price, currency)
                    `).order("created_at", { ascending: false });

                    if (!error && data) {
                        const { data: affs } = await supabase.from("affiliates").select("user_id, referral_code");
                        const affCodeMap = {};
                        if (affs) affs.forEach(a => { affCodeMap[a.user_id] = a.referral_code; });

                        let historyMap = {};
                        try {
                            const { data: hist } = await supabase.from("order_fulfillment_history").select("*").order("created_at", { ascending: true });
                            if (hist) {
                                hist.forEach(h => {
                                    if (!historyMap[h.order_id]) historyMap[h.order_id] = [];
                                    historyMap[h.order_id].push(h);
                                });
                            }
                        } catch (e) {
                            console.warn("[Amiele:Admin] Could not load fulfillment history:", e);
                        }

                        orderList = data.map(ord => {
                            const calculatedETB = getETBPrice(ord.product, ord.quantity || 1);
                            const finalETB = calculatedETB > 0 ? calculatedETB : 7500;

                            let fulStage = ord.fulfillment_status;
                            if (!fulStage) {
                                const st = (ord.status || "pending").toLowerCase();
                                const pst = (ord.payment_status || "pending_payment").toLowerCase();
                                fulStage = (st === "delivered") ? "Delivered"
                                    : (st === "shipped") ? "Shipped"
                                    : (st === "confirmed" || pst === "paid") ? "Payment Verified"
                                    : (st === "cancelled") ? "Cancelled" : "Pending";
                            }

                            return {
                                id: ord.id,
                                orderNumber: ord.order_number || ("AM-ORD-" + String(ord.id).slice(0, 4).toUpperCase()),
                                customerName: ord.customer_name || "Guest Customer",
                                customerEmail: ord.customer_email || "N/A",
                                phone: ord.phone || "N/A",
                                country: ord.country || "N/A",
                                referralCode: ord.referral_code || (ord.affiliate_id ? affCodeMap[ord.affiliate_id] : "Direct / None"),
                                affiliateId: ord.affiliate_id,
                                affiliateCode: affCodeMap[ord.affiliate_id] || ord.referral_code || "None",
                                productName: ord.product ? `${ord.quantity}x ${ord.product.name}` : `${ord.quantity || 1}x Instrument`,
                                quantity: ord.quantity || 1,
                                orderAmount: finalETB,
                                paymentStatus: ord.payment_status || "pending_payment",
                                orderStatus: ord.status || "pending",
                                fulfillmentStatus: fulStage,
                                trackingNumber: ord.tracking_number || "",
                                shippingCompany: ord.shipping_company || "",
                                shippingNotes: ord.shipping_notes || "",
                                estimatedDelivery: ord.estimated_delivery || "",
                                packedAt: ord.packed_at,
                                shippedAt: ord.shipped_at,
                                deliveredAt: ord.delivered_at,
                                lastStatusUpdate: ord.last_status_update || ord.created_at,
                                history: historyMap[ord.id] || [],
                                createdAt: ord.created_at
                            };
                        });
                    } else if (error) {
                        console.warn("[Amiele:Admin] Error querying Supabase orders:", error);
                    }
                } catch (e) {
                    console.warn("[Amiele:Admin] Exception fetching Supabase orders:", e);
                }
            }
            return orderList;
        },

        async updateFulfillmentStatus(orderId, newFulfillmentStatus, shippingDetails = {}, notes = "", adminUser = null) {
            console.log("[Amiele:Fulfillment] Updating fulfillment status for order:", orderId, "->", newFulfillmentStatus);
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase database client is unavailable.");

            const now = new Date().toISOString();
            const updatePayload = {
                fulfillment_status: newFulfillmentStatus,
                last_status_update: now
            };

            if (shippingDetails.tracking_number !== undefined) updatePayload.tracking_number = shippingDetails.tracking_number;
            if (shippingDetails.shipping_company !== undefined) updatePayload.shipping_company = shippingDetails.shipping_company;
            if (shippingDetails.shipping_notes !== undefined) updatePayload.shipping_notes = shippingDetails.shipping_notes;
            if (shippingDetails.estimated_delivery !== undefined) updatePayload.estimated_delivery = shippingDetails.estimated_delivery;

            if (newFulfillmentStatus === "Payment Verified") {
                updatePayload.payment_status = "paid";
                updatePayload.status = "confirmed";
                try { await this.approvePayment(orderId); } catch (e) { console.warn("[Amiele:Fulfillment] approvePayment trigger warning:", e); }
            } else if (newFulfillmentStatus === "Packed") {
                updatePayload.packed_at = now;
            } else if (newFulfillmentStatus === "Shipped") {
                updatePayload.shipped_at = now;
                updatePayload.status = "shipped";
            } else if (newFulfillmentStatus === "Delivered") {
                updatePayload.delivered_at = now;
                updatePayload.status = "delivered";
            } else if (newFulfillmentStatus === "Cancelled") {
                updatePayload.status = "cancelled";
            }

            const { data, error } = await supabase.from("orders").update(updatePayload).eq("id", orderId).select("*").single();
            if (error) {
                console.error("[Amiele:Fulfillment] Update Error:", error);
                throw new Error("Failed to update order fulfillment status: " + error.message);
            }

            try {
                const histPayload = {
                    order_id: orderId,
                    status: newFulfillmentStatus,
                    updated_by: adminUser ? adminUser.id : null,
                    admin_name: adminUser && (adminUser.full_name || adminUser.name || adminUser.email) ? (adminUser.full_name || adminUser.name || adminUser.email) : "Admin",
                    notes: notes || `Fulfillment status changed to ${newFulfillmentStatus}`,
                    created_at: now
                };
                await supabase.from("order_fulfillment_history").insert(histPayload);
            } catch (e) {
                console.warn("[Amiele:Fulfillment] History log insert error:", e);
            }

            return data;
        },

        async clearAllOrders() {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (supabase) {
                const { data: { user }, error: authErr } = await supabase.auth.getUser();
                if (authErr || !user) throw new Error("Authentication required to perform this action.");

                const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
                if (!profile || profile.role !== "admin") throw new Error("Access Denied: Only administrators can clear order history.");

                const { error: delErr } = await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                if (delErr) {
                    console.error("[Amiele:Admin] Remote orders delete failed:", delErr);
                    throw new Error("Failed to clear remote orders: " + delErr.message);
                }
            } else {
                const curUser = window.getCurrentUser ? await window.getCurrentUser() : null;
                if (!curUser || curUser.role !== "admin") throw new Error("Access Denied: Admin privileges required.");
            }

            localStorage.setItem("amiele_orders_cleared", "true");
            if (window.AmieleDB && typeof window.AmieleDB.resetOrdersData === "function") {
                window.AmieleDB.resetOrdersData();
            }
            return true;
        },

        async approvePayment(orderId) {
            console.log("[Amiele:Admin] Approving order payment server-side via RPC for order:", orderId);
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase database client is unavailable.");

            const { data, error } = await supabase.rpc("approve_order_payment", { target_order_id: orderId });
            if (error) {
                console.error("[Amiele:Admin] approve_order_payment RPC error:", error);
                throw new Error("Failed to approve payment: " + error.message);
            }
            return data;
        },

        async repairMissingCommissions() {
            console.log("[Amiele:Admin] Running repairMissingCommissions server-side via RPC...");
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase database client is unavailable.");

            const { data, error } = await supabase.rpc("repair_missing_commissions");
            if (error) {
                console.error("[Amiele:Admin] repair_missing_commissions RPC error:", error);
                throw new Error("Failed to repair missing commissions: " + error.message);
            }
            return data;
        },

        async rejectPayment(orderId) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (supabase && !String(orderId).startsWith("loc_ord_")) {
                try {
                    await supabase.from("orders").update({
                        payment_status: "failed",
                        status: "cancelled",
                        updated_at: new Date().toISOString()
                    }).eq("id", orderId);
                } catch (e) {
                    console.warn("[Amiele:Admin] Supabase rejectPayment error:", e);
                }
            }
            if (window.AmieleDB) {
                try {
                    const orders = window.AmieleDB.getOrders();
                    const ord = orders.find(o => o.id === orderId);
                    if (ord) {
                        ord.payment_status = "failed";
                        ord.status = "cancelled";
                        localStorage.setItem("amiele_local_orders", JSON.stringify(orders));
                    }
                } catch (e) {
                    console.warn("[Amiele:Admin] Local rejectPayment error:", e);
                }
            }
            return { success: true };
        },

        async updateOrderStatus(orderId, newStatus) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId).select().single();
            if (error) throw error;
            return data;
        },

        async getWithdrawals() {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) return [];

            const { data, error } = await supabase.from("affiliate_withdrawals").select("*").order("created_at", { ascending: false });
            if (error) {
                console.error("[Amiele:Admin] Error fetching withdrawals:", error);
                return [];
            }

            const affIds = data.map(w => w.affiliate_id);
            const { data: profiles, error: profErr } = await supabase.from("profiles").select("id, full_name").in("id", affIds);
            const profileMap = {};
            if (!profErr && profiles) {
                profiles.forEach(p => { profileMap[p.id] = p.full_name; });
            }

            return data.map(w => ({
                id: "wth_" + w.id.slice(0, 8),
                rawId: w.id,
                affiliateId: profileMap[w.affiliate_id] || w.affiliate_id,
                affiliateUuid: w.affiliate_id,
                amount: parseFloat(w.amount),
                method: w.method,
                phone: w.phone,
                status: w.status,
                rejectionReason: w.rejection_reason || null,
                createdAt: w.created_at
            }));
        },

        async updateWithdrawalStatus(withdrawalId, newStatus, adminId, rejectionReason) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.rpc("admin_update_withdrawal_status", {
                p_withdrawal_id: withdrawalId,
                p_new_status: newStatus,
                p_admin_id: adminId || null,
                p_rejection_reason: rejectionReason || null
            });

            if (error) {
                console.error("[Amiele:Admin] Error updating withdrawal status:", error);
                throw new Error(error.message || "Failed to update withdrawal status.");
            }

            return data;
        },

        async createCampaign(title, description, targetSales, reward, endsAt, adminId) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.from("affiliate_campaigns").insert({
                title,
                description,
                target_sales: targetSales,
                reward,
                ends_at: endsAt,
                status: "active",
                created_by: adminId
            }).select().single();

            if (error) throw error;
            return data;
        },

        async updateCampaign(campaignId, updates) {
            try {
                const local = JSON.parse(localStorage.getItem("amiele_campaigns")) || [];
                const idx = local.findIndex(c => String(c.id) === String(campaignId));
                if (idx !== -1) {
                    local[idx] = { ...local[idx], ...updates };
                    localStorage.setItem("amiele_campaigns", JSON.stringify(local));
                }
            } catch (e) {}

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId);
            if (!isUuid) {
                return { id: campaignId, ...updates };
            }

            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.from("affiliate_campaigns").update(updates).eq("id", campaignId).select().single();
            if (error) throw error;
            return data;
        },

        async deleteCampaign(campaignId) {
            try {
                const local = JSON.parse(localStorage.getItem("amiele_campaigns")) || [];
                const filtered = local.filter(c => String(c.id) !== String(campaignId));
                localStorage.setItem("amiele_campaigns", JSON.stringify(filtered));
            } catch (e) {}

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId);
            if (!isUuid) {
                return true;
            }

            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) return true;

            const { error } = await supabase.from("affiliate_campaigns").delete().eq("id", campaignId);
            if (error) throw error;
            return true;
        },

        async createAnnouncement(title, content, type, urgency, adminId) {
            const supabase = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.from("affiliate_announcements").insert({
                title,
                content,
                type,
                urgency,
                created_by: adminId
            }).select().single();

            if (error) throw error;
            return data;
        }
    };

    window.AdminService = AdminService;
})();