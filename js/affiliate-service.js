/**
 * Amiele Begena - Affiliate Service
 * Handles affiliate applications, click tracking, metadata computation,
 * ledger queries, withdrawals, campaigns, announcements, and real-time dashboard updates.
 */

(function () {
    "use strict";

    let activeRealtimeChannel = null;

    const AffiliateService = {
        /**
         * Submit a new affiliate application or update a pending application
         */
        async submitApplication(userId, motivation, socialLink) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) throw new Error("Supabase client not initialized");

            const { data, error } = await client
                .from("affiliate_applications")
                .insert({
                    user_id: userId,
                    motivation: motivation,
                    social_link: socialLink,
                    status: "pending"
                })
                .select()
                .single();

            if (error && error.code === "23505") {
                // Unique constraint violation -> update existing application
                const { data: updatedData, error: updateError } = await client
                    .from("affiliate_applications")
                    .update({
                        motivation: motivation,
                        social_link: socialLink,
                        status: "pending",
                        reviewed_by: null,
                        reviewed_at: null
                    })
                    .eq("user_id", userId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return updatedData;
            }

            if (error) throw error;
            return data;
        },

        /**
         * Fetch current user's application status
         */
        async getUserApplication(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return null;

            const { data, error } = await client
                .from("affiliate_applications")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (error) {
                console.error("[Amiele:Affiliate] Error fetching application:", error);
                return null;
            }
            return data;
        },

        /**
         * Track an affiliate link click
         */
        async trackAffiliateClick(referralCode) {
            if (!referralCode || typeof referralCode !== "string") return;
            const code = referralCode.trim();
            if (!code) return;

            localStorage.setItem("amiele_referral_code", code);
            localStorage.setItem("amiele_ref_code", code);

            const storageKey = "amiele_click_time_" + code.toLowerCase();
            const lastClick = localStorage.getItem(storageKey);
            const now = Date.now();

            // Throttle clicks within 24 hours per referral code locally
            if (lastClick && now - parseInt(lastClick, 10) < 86400000) {
                console.log("[Amiele:Affiliate] Duplicate click skipped within 24h window");
                return;
            }

            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                console.error("[Amiele:Affiliate] Supabase client unavailable for click tracking");
                return;
            }

            try {
                const { data: aff, error: lookupErr } = await client
                    .from("affiliates")
                    .select("user_id, referral_code")
                    .ilike("referral_code", code)
                    .maybeSingle();

                if (lookupErr) {
                    console.error("[Amiele:Affiliate] Supabase Affiliate Query Error:", lookupErr);
                    return;
                }
                if (!aff) {
                    console.log("[Amiele:Affiliate] Affiliate not found for code:", code);
                    return;
                }

                let payload = {
                    affiliate_id: aff.user_id,
                    referral_code: aff.referral_code,
                    user_agent: navigator.userAgent,
                    ip_address: null
                };

                let { data: inserted, error: insertErr } = await client
                    .from("affiliate_clicks")
                    .insert(payload)
                    .select()
                    .single();

                if (insertErr) {
                    console.warn("[Amiele:Affiliate] Full payload insert warning, retrying minimal payload:", insertErr);
                    const { data: retryData, error: retryErr } = await client
                        .from("affiliate_clicks")
                        .insert({
                            affiliate_id: aff.user_id,
                            referral_code: aff.referral_code
                        })
                        .select()
                        .single();

                    if (retryErr) {
                        console.error("[Amiele:Affiliate] Click insert failed:", retryErr);
                        return;
                    }
                    inserted = retryData;
                }

                localStorage.setItem(storageKey, String(now));
                console.log("[Amiele:Affiliate] Click tracked successfully:", inserted);
            } catch (err) {
                console.error("[Amiele:Affiliate] Exception in trackAffiliateClick:", err);
            }
        },

        /**
         * Retrieve comprehensive metadata & metrics for an affiliate
         */
        async getAffiliateMetadata(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return null;

            let affiliate = null;
            try {
                const { data, error } = await client
                    .from("affiliates")
                    .select("*")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (!error && data) {
                    affiliate = data;
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Supabase fetch affiliate error:", err);
            }

            if (!affiliate) return null;

            const code = affiliate.referral_code || "";

            // 1. Query clicks statistics
            let clicksTotal = 0;
            let clicksToday = 0;
            let clicksWeek = 0;
            let clicksMonth = 0;
            let clicksYear = 0;
            let uniqueClicks = 0;

            try {
                const { data: clicksData, error: clicksErr } = await client
                    .from("affiliate_clicks")
                    .select("created_at, user_agent")
                    .or(`affiliate_id.eq.${userId},referral_code.eq.${code}`);

                if (!clicksErr && clicksData) {
                    clicksTotal = clicksData.length;
                    const now = new Date();
                    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    const dayOfWeek = now.getDay();
                    const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
                    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    const startYear = new Date(now.getFullYear(), 0, 1).getTime();
                    const userAgents = new Set();

                    clicksData.forEach((row) => {
                        const clickTime = new Date(row.created_at).getTime();
                        if (row.user_agent) userAgents.add(row.user_agent);
                        if (clickTime >= startToday) clicksToday++;
                        if (clickTime >= startWeek) clicksWeek++;
                        if (clickTime >= startMonth) clicksMonth++;
                        if (clickTime >= startYear) clicksYear++;
                    });

                    uniqueClicks = userAgents.size > 0 ? userAgents.size : clicksTotal;
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Error querying affiliate_clicks:", err);
            }

            // 2. Query orders statistics
            let pendingCommission = 0;
            let totalOrders = 0;
            let grossVolume = 0;

            try {
                const { data: ordersData } = await client
                    .from("orders")
                    .select("quantity, payment_status, status, product:products(price, currency)")
                    .or(`affiliate_id.eq.${userId},referral_code.eq.${code}`);

                if (ordersData && ordersData.length > 0) {
                    totalOrders = ordersData.length;
                    ordersData.forEach((ord) => {
                        let unitPrice = ord.product ? parseFloat(ord.product.price || 0) : 0;
                        if (ord.product && ord.product.currency === "USD") {
                            unitPrice *= 120; // ETB conversion for gross volume calculation
                        }
                        const orderTotal = unitPrice * (ord.quantity || 1);
                        grossVolume += orderTotal;

                        if (ord.payment_status === "pending_payment") {
                            pendingCommission += Math.round(0.08 * orderTotal);
                        }
                    });
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Error fetching orders:", err);
            }

            // 3. Query authoritative commissions table for total approved earnings
            let totalEarnings = 0;
            let approvedCommissionCount = 0;

            try {
                const { data: commsData } = await client
                    .from("commissions")
                    .select("amount, status")
                    .eq("affiliate_id", userId)
                    .eq("status", "approved");

                if (commsData && commsData.length > 0) {
                    totalEarnings = commsData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
                    approvedCommissionCount = commsData.length;
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Error querying commissions:", err);
            }

            // Determine authoritative sales count (maximum of profile sales_count and approved commissions count)
            const salesCount = Math.max(affiliate.sales_count || 0, approvedCommissionCount);

            // 4. Query withdrawals
            let totalPaid = 0;
            try {
                const { data: wthData } = await client
                    .from("affiliate_withdrawals")
                    .select("amount, status")
                    .eq("affiliate_id", userId);

                if (wthData) {
                    totalPaid = wthData
                        .filter((w) => w.status === "approved" || w.status === "paid")
                        .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Error fetching withdrawals:", err);
            }

            const availableBalance = Math.max(0, totalEarnings - totalPaid);

            const metadata = {
                userId: userId,
                code: code,
                couponCode: code.toUpperCase() + "5",
                tier: affiliate.tier || "standard",
                balance: availableBalance,
                totalEarnings: totalEarnings,
                pendingCommission: pendingCommission,
                totalPaid: totalPaid,
                sales: salesCount,
                totalOrders: Math.max(totalOrders, salesCount),
                grossVolume: grossVolume,
                clicks: clicksTotal,
                uniqueClicks: uniqueClicks,
                clicksToday: clicksToday,
                clicksWeek: clicksWeek,
                clicksMonth: clicksMonth,
                clicksYear: clicksYear
            };

            return metadata;
        },

        /**
         * Fetch the full commissions ledger using `public.commissions` as primary truth,
         * enriched with order details and pending order fallback.
         */
        async getCommissionsLedger(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return [];

            let referralCode = "";
            try {
                const { data: aff } = await client
                    .from("affiliates")
                    .select("referral_code")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (aff) referralCode = aff.referral_code || "";
            } catch (err) {}

            // 1. Query public.commissions table directly for all approved/paid/rejected commission rows
            const { data: commissionsData, error: commsErr } = await client
                .from("commissions")
                .select(`
                    id,
                    order_id,
                    affiliate_id,
                    amount,
                    rate,
                    status,
                    created_at,
                    order:orders(
                        order_number,
                        quantity,
                        status,
                        payment_status,
                        created_at,
                        product:products(name, price, currency)
                    )
                `)
                .eq("affiliate_id", userId)
                .order("created_at", { ascending: false });

            if (commsErr) {
                console.error("[Amiele:Affiliate] Error fetching commissions ledger from commissions table:", commsErr);
            }

            const ledgerItems = [];
            const processedOrderIds = new Set();

            if (commissionsData && commissionsData.length > 0) {
                commissionsData.forEach((comm) => {
                    processedOrderIds.add(comm.order_id);

                    const ord = comm.order || {};
                    const prod = ord.product || {};

                    let unitPrice = prod.price ? parseFloat(prod.price) : 0;
                    if (prod.currency === "USD") unitPrice *= 120;
                    const orderAmount = unitPrice * (ord.quantity || 1);

                    ledgerItems.push({
                        id: "comm_" + comm.id.slice(0, 8),
                        orderId: ord.order_number || "#HA-" + comm.order_id.slice(0, 4).toUpperCase(),
                        productName: prod.name ? `${ord.quantity || 1}x ${prod.name}` : "Instrument",
                        orderAmount: orderAmount,
                        commissionAmount: parseFloat(comm.amount || 0),
                        status: comm.status,
                        createdAt: comm.created_at
                    });
                });
            }

            // 2. Query orders for pending orders that do not yet have a commission record
            try {
                let ordersQuery = client.from("orders").select(`
                    id,
                    order_number,
                    quantity,
                    status,
                    payment_status,
                    created_at,
                    product:products(name, price, currency)
                `);

                ordersQuery = referralCode
                    ? ordersQuery.or(`affiliate_id.eq.${userId},referral_code.eq.${referralCode}`)
                    : ordersQuery.eq("affiliate_id", userId);

                const { data: ordersData } = await ordersQuery.order("created_at", { ascending: false });

                if (ordersData && ordersData.length > 0) {
                    ordersData.forEach((ord) => {
                        if (!processedOrderIds.has(ord.id) && ord.payment_status === "pending_payment") {
                            const prod = ord.product || {};
                            let unitPrice = prod.price ? parseFloat(prod.price) : 0;
                            if (prod.currency === "USD") unitPrice *= 120;
                            const orderAmount = unitPrice * (ord.quantity || 1);
                            const estimatedComm = Math.round(orderAmount * 0.08);

                            ledgerItems.push({
                                id: "comm_" + ord.id.slice(0, 8),
                                orderId: ord.order_number || "#HA-" + ord.id.slice(0, 4).toUpperCase(),
                                productName: prod.name ? `${ord.quantity || 1}x ${prod.name}` : "Instrument",
                                orderAmount: orderAmount,
                                commissionAmount: estimatedComm,
                                status: "pending",
                                createdAt: ord.created_at
                            });
                        }
                    });
                }
            } catch (err) {
                console.warn("[Amiele:Affiliate] Error fetching pending orders for ledger:", err);
            }

            // Sort all ledger items descending by creation date
            ledgerItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return ledgerItems;
        },

        /**
         * Subscribe to real-time database changes on commissions, affiliates, and orders for an affiliate
         */
        subscribeToAffiliateUpdates(userId, onUpdateCallback) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) {
                console.warn("[Amiele:Affiliate] Cannot subscribe to Realtime: Supabase client or userId missing.");
                return () => {};
            }

            if (activeRealtimeChannel) {
                try {
                    client.removeChannel(activeRealtimeChannel);
                } catch (e) {}
                activeRealtimeChannel = null;
            }

            try {
                const channelName = `affiliate-realtime:${userId}`;
                activeRealtimeChannel = client
                    .channel(channelName)
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "commissions",
                            filter: `affiliate_id=eq.${userId}`
                        },
                        (payload) => {
                            console.log("[Amiele:Realtime] Commission change detected:", payload.eventType, payload);
                            window.dispatchEvent(new CustomEvent("amiele-commission-updated", { detail: payload }));
                            if (typeof onUpdateCallback === "function") onUpdateCallback(payload);
                        }
                    )
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "affiliates",
                            filter: `user_id=eq.${userId}`
                        },
                        (payload) => {
                            console.log("[Amiele:Realtime] Affiliate profile change detected:", payload.eventType, payload);
                            window.dispatchEvent(new CustomEvent("amiele-commission-updated", { detail: payload }));
                            if (typeof onUpdateCallback === "function") onUpdateCallback(payload);
                        }
                    )
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "orders",
                            filter: `affiliate_id=eq.${userId}`
                        },
                        (payload) => {
                            console.log("[Amiele:Realtime] Order change detected for affiliate:", payload.eventType, payload);
                            window.dispatchEvent(new CustomEvent("amiele-commission-updated", { detail: payload }));
                            if (typeof onUpdateCallback === "function") onUpdateCallback(payload);
                        }
                    )
                    .subscribe((status) => {
                        console.log(`[Amiele:Realtime] Subscription status for channel ${channelName}:`, status);
                    });

                return () => {
                    if (activeRealtimeChannel) {
                        client.removeChannel(activeRealtimeChannel);
                        activeRealtimeChannel = null;
                    }
                };
            } catch (err) {
                console.error("[Amiele:Affiliate] Exception establishing Realtime channel:", err);
                return () => {};
            }
        },

        /**
         * Fetch withdrawal history for affiliate
         */
        async getWithdrawals(userId) {
            const client = window.AmieleSupabase.getClient();
            if (!client || !userId) return [];

            const { data, error } = await client
                .from("affiliate_withdrawals")
                .select("*")
                .eq("affiliate_id", userId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("[Amiele:Affiliate] Error fetching withdrawals:", error);
                return [];
            }
            return data.map((item) => ({
                id: "wth_" + item.id.slice(0, 8),
                amount: parseFloat(item.amount),
                method: item.method,
                phone: item.phone,
                status: item.status,
                createdAt: item.created_at
            }));
        },

        /**
         * Request payout withdrawal
         */
        async requestWithdrawal(userId, amount, method, phone) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error("Supabase client not initialized");

            const metadata = await this.getAffiliateMetadata(userId);
            if (!metadata || amount > metadata.balance) {
                throw new Error("Insufficient balance to perform withdrawal. / በቂ ሂሳብ የሎትም።");
            }

            const { data, error } = await client
                .from("affiliate_withdrawals")
                .insert({
                    affiliate_id: userId,
                    amount: amount,
                    method: method,
                    phone: phone,
                    status: "pending"
                })
                .select()
                .single();

            if (error) throw error;
            return {
                id: "wth_" + data.id.slice(0, 8),
                amount: parseFloat(data.amount),
                method: data.method,
                phone: data.phone,
                status: data.status,
                createdAt: data.createdAt || data.created_at
            };
        },

        /**
         * Fetch active bonus campaigns
         */
        async getCampaigns() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from("affiliate_campaigns")
                .select("*")
                .eq("status", "active")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("[Amiele:Affiliate] Error fetching campaigns:", error);
                return [];
            }
            return data.map((item) => {
                const endsDate = new Date(item.ends_at);
                const diffMs = Math.max(0, endsDate - new Date());
                const daysRemaining = Math.ceil(diffMs / 86400000);
                return {
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    targetSales: item.target_sales,
                    reward: parseFloat(item.reward),
                    daysRemaining: daysRemaining,
                    status: item.status
                };
            });
        },

        /**
         * Fetch announcements bulletin
         */
        async getAnnouncements() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from("affiliate_announcements")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("[Amiele:Affiliate] Error fetching announcements:", error);
                return [];
            }
            return data.map((item) => ({
                id: item.id,
                title: item.title,
                content: item.content,
                type: item.type,
                urgency: item.urgency,
                createdAt: item.created_at
            }));
        },

        /**
         * Fetch monthly earnings chart dataset
         */
        async getEarningsChartData(userId, currentTotalEarnings) {
            const client = window.AmieleSupabase.getClient();
            if (!client || !userId) return [0, 0, 0, 0, 0, currentTotalEarnings];

            const { data, error } = await client
                .from("orders")
                .select(`
                    quantity,
                    status,
                    created_at,
                    product:products(price, currency)
                `)
                .eq("affiliate_id", userId)
                .neq("status", "cancelled");

            if (error || !data) return [0, 0, 0, 0, 0, currentTotalEarnings];

            const dataset = Array(6).fill(0);
            const now = new Date();
            const commissionRate = 0.08;

            data.forEach((ord) => {
                const ordDate = new Date(ord.created_at);
                const monthDiff = (now.getFullYear() - ordDate.getFullYear()) * 12 + (now.getMonth() - ordDate.getMonth());
                if (monthDiff >= 0 && monthDiff < 6) {
                    let unitPrice = ord.product ? parseFloat(ord.product.price || 0) : 0;
                    if (ord.product && ord.product.currency === "USD") unitPrice *= 120;
                    const orderTotal = unitPrice * (ord.quantity || 1);
                    dataset[5 - monthDiff] += orderTotal * commissionRate;
                }
            });

            return dataset;
        },

        /**
         * Update user profile settings
         */
        async updateProfile(userId, settings) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error("Supabase client not initialized");

            const updates = {};
            if (settings.name !== undefined) updates.full_name = settings.name;
            if (settings.phone !== undefined) updates.phone = settings.phone;
            if (settings.photoUrl !== undefined) updates.avatar_url = settings.photoUrl;

            if (Object.keys(updates).length > 0) {
                const { error } = await client
                    .from("profiles")
                    .update(updates)
                    .eq("id", userId);

                if (error) {
                    console.warn("[Amiele:AffiliateService] Profile update warning:", error);
                    if (updates.full_name) {
                        await client.from("profiles").update({ full_name: updates.full_name }).eq("id", userId);
                    }
                }
            }

            if (settings.password && settings.password.trim().length >= 6) {
                const { error: passErr } = await client.auth.updateUser({ password: settings.password.trim() });
                if (passErr) throw passErr;
            }

            try {
                const stored = JSON.parse(localStorage.getItem("amiele_current_user") || "null");
                if (stored && stored.id === userId) {
                    if (settings.name !== undefined) stored.name = settings.name;
                    if (settings.phone !== undefined) stored.phone = settings.phone;
                    if (settings.country !== undefined) stored.country = settings.country;
                    if (settings.photoUrl !== undefined) {
                        stored.photoUrl = settings.photoUrl;
                        stored.avatar_url = settings.photoUrl;
                    }
                    if (settings.notifPreferences !== undefined) stored.notifPreferences = settings.notifPreferences;
                    localStorage.setItem("amiele_current_user", JSON.stringify(stored));
                    localStorage.setItem("amiele_current_session", JSON.stringify(stored));
                }
            } catch (err) {
                console.warn("[Amiele:AffiliateService] Cache sync warning:", err);
            }

            return true;
        }
    };

    window.AffiliateService = AffiliateService;
})();