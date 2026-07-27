/**
 * Amiele Begena — Affiliate Service Layer
 * Interfaces with Supabase to manage affiliate onboarding, metrics, and ledger logs.
 */

(function () {
    'use strict';

    const AffiliateService = {
        /**
         * Submit a new partnership application.
         */
        async submitApplication(userId, motivation, socialLink) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // 1. Try INSERT first for new applications
            const { data, error } = await client
                .from('affiliate_applications')
                .insert({
                    user_id: userId,
                    motivation,
                    social_link: socialLink,
                    status: 'pending'
                })
                .select()
                .single();

            // 2. If duplicate key (error code 23505), update the existing record
            if (error && error.code === '23505') {
                const { data: updatedData, error: updateError } = await client
                    .from('affiliate_applications')
                    .update({
                        motivation,
                        social_link: socialLink,
                        status: 'pending',
                        reviewed_by: null,
                        reviewed_at: null
                    })
                    .eq('user_id', userId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                return updatedData;
            }

            if (error) throw error;
            return data;
        },

        /**
         * Get application status for a user.
         */
        async getUserApplication(userId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return null;

            const { data, error } = await client
                .from('affiliate_applications')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('[Amiele:Affiliate] Error fetching application:', error);
                return null;
            }
            return data;
        },

        /**
         * Track affiliate click when visitor lands with ?ref=<code_val>
         */
        async trackAffiliateClick(refCode) {
            console.log("trackAffiliateClick() called");
            if (!refCode || typeof refCode !== 'string') return;
            const cleanCode = refCode.trim();
            if (!cleanCode) return;

            // Save referral code in localStorage
            localStorage.setItem('amiele_referral_code', cleanCode);
            localStorage.setItem('amiele_ref_code', cleanCode);

            // Prevent duplicate clicks within 24 hours
            const lastClickTimeKey = 'amiele_click_time_' + cleanCode.toLowerCase();
            const lastClickTime = localStorage.getItem(lastClickTimeKey);
            const now = Date.now();
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

            if (lastClickTime && (now - parseInt(lastClickTime, 10)) < TWENTY_FOUR_HOURS) {
                console.log("Duplicate click skipped");
                return;
            }

            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                console.error("Supabase client unavailable for click tracking");
                return;
            }

            try {
                console.log("Affiliate lookup started");
                // Query affiliates table using referral_code to obtain affiliate_id
                const { data: affData, error: affErr } = await client
                    .from('affiliates')
                    .select('user_id, referral_code')
                    .ilike('referral_code', cleanCode)
                    .maybeSingle();

                if (affErr) {
                    console.error("Supabase Affiliate Query Error:", affErr);
                    return;
                }

                if (!affData) {
                    console.log("Affiliate not found");
                    return;
                }

                console.log("Affiliate found:", affData);
                console.log("Inserting affiliate_clicks row");

                let clickPayload = {
                    affiliate_id: affData.user_id,
                    referral_code: affData.referral_code,
                    user_agent: navigator.userAgent,
                    ip_address: null
                };

                let { data: clickRecord, error: insertErr } = await client
                    .from('affiliate_clicks')
                    .insert(clickPayload)
                    .select()
                    .single();

                if (insertErr) {
                    console.warn("Full payload insert warning, retrying minimal payload:", insertErr);
                    const { data: minRecord, error: minErr } = await client
                        .from('affiliate_clicks')
                        .insert({
                            affiliate_id: affData.user_id,
                            referral_code: affData.referral_code
                        })
                        .select()
                        .single();

                    if (minErr) {
                        console.error("Insert failed:", minErr);
                        return;
                    } else {
                        clickRecord = minRecord;
                        insertErr = null;
                    }
                }

                localStorage.setItem(lastClickTimeKey, String(now));
                console.log("Insert successful", clickRecord);
            } catch (err) {
                console.error("Exception in trackAffiliateClick:", err);
            }
        },

        /**
         * Resolve metadata and performance stats for an affiliate strictly from Supabase.
         */
        async getAffiliateMetadata(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return null;

            let aff = null;
            try {
                const { data, error } = await client
                    .from('affiliates')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();
                if (!error && data) aff = data;
            } catch (e) {
                console.warn('[Amiele:Affiliate] Supabase fetch affiliate error:', e);
            }

            if (!aff) {
                return null;
            }

            const code = aff.referral_code || '';

            // Calculate click stats directly from public.affiliate_clicks table in Supabase
            let totalClicks = 0;
            let clicksToday = 0;
            let clicksWeek = 0;
            let clicksMonth = 0;
            let clicksYear = 0;
            let uniqueClicks = 0;

            try {
                const { data: clickRows, error: clickFetchErr } = await client
                    .from('affiliate_clicks')
                    .select('created_at, user_agent')
                    .or(`affiliate_id.eq.${userId},referral_code.eq.${code}`);

                if (!clickFetchErr && clickRows) {
                    totalClicks = clickRows.length;
                    const now = new Date();

                    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    const dayOfWeek = now.getDay();
                    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

                    const userAgents = new Set();

                    clickRows.forEach(c => {
                        const clickTime = new Date(c.created_at).getTime();
                        if (c.user_agent) userAgents.add(c.user_agent);

                        if (clickTime >= startOfDay) clicksToday++;
                        if (clickTime >= startOfWeek) clicksWeek++;
                        if (clickTime >= startOfMonth) clicksMonth++;
                        if (clickTime >= startOfYear) clicksYear++;
                    });

                    uniqueClicks = userAgents.size > 0 ? userAgents.size : totalClicks;
                }
            } catch (e) {
                console.warn('[Amiele:Affiliate] Error querying affiliate_clicks:', e);
            }

            let exchangeRate = 120;
            try {
                const { data, error } = await client.rpc('get_exchange_rate');
                if (!error && data) exchangeRate = parseFloat(data);
            } catch (err) {}

            // Calculate pending & approved commissions strictly from Supabase
            let pendingCommission = 0;
            let totalEarnings = 0;
            let totalPaid = 0;
            let totalOrders = 0;
            let paidOrders = 0;
            let grossVolume = 0;

            try {
                // Query ALL orders referred by affiliate_id or referral_code
                const { data: allReferredOrders } = await client
                    .from('orders')
                    .select('quantity, payment_status, status, product:products(price)')
                    .or(`affiliate_id.eq.${userId},referral_code.eq.${code}`);

                if (allReferredOrders && allReferredOrders.length > 0) {
                    totalOrders = allReferredOrders.length;

                    allReferredOrders.forEach(o => {
                        const itemPriceUSD = o.product ? parseFloat(o.product.price) : 100;
                        const orderAmountETB = itemPriceUSD * (o.quantity || 1) * exchangeRate;
                        grossVolume += orderAmountETB;

                        if (o.payment_status === 'pending_payment') {
                            pendingCommission += Math.round(orderAmountETB * 0.10);
                        } else if (o.payment_status === 'paid' || o.status === 'confirmed') {
                            paidOrders++;
                        }
                    });
                }
            } catch (e) {
                console.warn('[Amiele:Affiliate] Error fetching orders:', e);
            }

            let totalSalesCount = Math.max(aff.sales_count || 0, paidOrders);

            try {
                // Approved Commissions from commissions table
                const { data: comms } = await client
                    .from('commissions')
                    .select('amount, status')
                    .eq('affiliate_id', userId)
                    .eq('status', 'approved');

                if (comms && comms.length > 0) {
                    totalEarnings = comms.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                    totalSalesCount = Math.max(totalSalesCount, comms.length);
                }
            } catch (err) {}

            try {
                // Paid Withdrawals
                const { data: withdrawals } = await client
                    .from('affiliate_withdrawals')
                    .select('amount, status')
                    .eq('affiliate_id', userId);

                if (withdrawals) {
                    totalPaid = withdrawals
                        .filter(w => w.status === 'approved' || w.status === 'paid')
                        .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
                }
            } catch (wthErr) {}

            const balance = Math.max(0, totalEarnings - totalPaid);

            const dashboardStats = {
                userId,
                code,
                couponCode: code.toUpperCase() + '5',
                tier: totalSalesCount >= 30 ? 'gold' : (totalSalesCount >= 10 ? 'silver' : 'bronze'),
                balance,
                totalEarnings,
                pendingCommission,
                totalPaid,
                sales: totalSalesCount,
                totalOrders: Math.max(totalOrders, totalSalesCount),
                grossVolume,
                clicks: totalClicks,
                uniqueClicks: uniqueClicks,
                clicksToday: clicksToday,
                clicksWeek: clicksWeek,
                clicksMonth: clicksMonth,
                clicksYear: clicksYear
            };

            console.log("Dashboard Stats:", dashboardStats);
            return dashboardStats;
        },

        /**
         * Fetch commissions ledger list.
         */
        async getCommissionsLedger(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return [];

            // Fetch affiliate referral code
            let refCode = '';
            try {
                const { data: affRec } = await client.from('affiliates').select('referral_code').eq('user_id', userId).maybeSingle();
                if (affRec) refCode = affRec.referral_code || '';
            } catch (e) {}

            // Fetch orders referred by affiliate_id or referral_code
            let ordersQuery = client.from('orders').select(`
                id,
                order_number,
                quantity,
                status,
                payment_status,
                created_at,
                product:products(name, price)
            `);

            if (refCode) {
                ordersQuery = ordersQuery.or(`affiliate_id.eq.${userId},referral_code.eq.${refCode}`);
            } else {
                ordersQuery = ordersQuery.eq('affiliate_id', userId);
            }

            const { data: orders, error: ordersErr } = await ordersQuery.order('created_at', { ascending: false });

            if (ordersErr) {
                console.error('[Amiele:Affiliate] Error fetching orders for ledger:', ordersErr);
                return [];
            }

            // Fetch approved commissions
            const { data: comms, error: commsErr } = await client
                .from('commissions')
                .select('*')
                .eq('affiliate_id', userId);

            const commMap = {};
            if (!commsErr && comms) {
                comms.forEach(c => {
                    commMap[c.order_id] = c;
                });
            }

            // Fetch stats and exchange rate via RPC
            let commRate = 0.10;
            let exchangeRate = 120;
            try {
                const { data: stats } = await client.rpc('get_affiliate_stats', { user_id_val: userId });
                if (stats) commRate = stats.commission_rate;
                
                const { data: exRate } = await client.rpc('get_exchange_rate');
                if (exRate) exchangeRate = parseFloat(exRate);
            } catch (err) {
                console.error('[Amiele:Affiliate] Error fetching stats/exchange rate for ledger:', err);
            }
            return orders.map(o => {
                const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                
                let commissionAmount = orderAmountETB * commRate;
                let commStatus = 'pending';

                if (commMap[o.id]) {
                    commissionAmount = parseFloat(commMap[o.id].amount);
                    commStatus = commMap[o.id].status;
                } else if (o.payment_status === 'paid') {
                    commStatus = 'approved';
                } else if (o.status === 'cancelled') {
                    commStatus = 'cancelled';
                }

                return {
                    id: 'comm_' + o.id.slice(0, 8),
                    orderId: o.order_number || ('#HA-' + o.id.slice(0, 4).toUpperCase()),
                    productName: o.product ? `${o.quantity}x ${o.product.name}` : 'Instrument',
                    orderAmount: orderAmountETB,
                    commissionAmount: commissionAmount,
                    status: commStatus,
                    createdAt: o.created_at
                };
            });
        },

        /**
         * Fetch withdrawals from Supabase.
         */
        async getWithdrawals(userId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('affiliate_withdrawals')
                .select('*')
                .eq('affiliate_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Amiele:Affiliate] Error fetching withdrawals:', error);
                return [];
            }

            return data.map(w => ({
                id: 'wth_' + w.id.slice(0, 8),
                amount: parseFloat(w.amount),
                method: w.method,
                phone: w.phone,
                status: w.status,
                createdAt: w.created_at
            }));
        },

        /**
         * Submit a withdrawal payout request.
         */
        async requestWithdrawal(userId, amount, method, phone) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // Validate balance
            const meta = await this.getAffiliateMetadata(userId);
            if (!meta || amount > meta.balance) {
                throw new Error('Insufficient balance to perform withdrawal. / በቂ ሂሳብ የሎትም።');
            }

            const { data, error } = await client
                .from('affiliate_withdrawals')
                .insert({
                    affiliate_id: userId,
                    amount: amount,
                    method: method,
                    phone: phone,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: 'wth_' + data.id.slice(0, 8),
                amount: parseFloat(data.amount),
                method: data.method,
                phone: data.phone,
                status: data.status,
                createdAt: data.created_at
            };
        },

        /**
         * Fetch active campaigns.
         */
        async getCampaigns() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('affiliate_campaigns')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Amiele:Affiliate] Error fetching campaigns:', error);
                return [];
            }

            return data.map(c => {
                const endsAt = new Date(c.ends_at);
                const diffTime = Math.max(0, endsAt - new Date());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return {
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    targetSales: c.target_sales,
                    reward: parseFloat(c.reward),
                    daysRemaining: diffDays,
                    status: c.status
                };
            });
        },

        /**
         * Fetch announcements bulletin.
         */
        async getAnnouncements() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('affiliate_announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Amiele:Affiliate] Error fetching announcements:', error);
                return [];
            }

            return data.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                type: a.type,
                urgency: a.urgency,
                createdAt: a.created_at
            }));
        },

        /**
         * Fetch monthly aggregated earnings chart data.
         */
        async getEarningsChartData(userId, currentTotalEarnings) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [0, 0, 0, 0, 0, currentTotalEarnings];

            const { data: orders, error } = await client
                .from('orders')
                .select(`
                    quantity,
                    status,
                    created_at,
                    product:products(price)
                `)
                .eq('affiliate_id', userId)
                .neq('status', 'cancelled');

            if (error || !orders) {
                return [0, 0, 0, 0, 0, currentTotalEarnings];
            }

            const monthBuckets = Array(6).fill(0);
            const now = new Date();
            const exchangeRate = 120;
            
            const salesCount = orders.length;
            let commRate = 0.10;
            if (salesCount >= 30) commRate = 0.15;
            else if (salesCount >= 10) commRate = 0.12;

            orders.forEach(o => {
                const orderDate = new Date(o.created_at);
                const monthDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());
                
                if (monthDiff >= 0 && monthDiff < 6) {
                    const priceUSD = o.product ? parseFloat(o.product.price) : 0;
                    const orderAmountETB = priceUSD * o.quantity * exchangeRate;
                    const commission = orderAmountETB * commRate;
                    
                    const bucketIndex = 5 - monthDiff;
                    monthBuckets[bucketIndex] += commission;
                }
            });

            return monthBuckets;
        },

        /**
         * Update user profiles and credentials in Supabase.
         */
        async updateProfile(userId, profileData) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { error: profileError } = await client
                .from('profiles')
                .update({
                    full_name: profileData.name,
                    phone: profileData.phone,
                    avatar_url: profileData.photoUrl
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            if (profileData.password) {
                const { error: passwordError } = await client.auth.updateUser({
                    password: profileData.password
                });
                if (passwordError) throw passwordError;
            }

            return true;
        }
    };

    window.AffiliateService = AffiliateService;
})();
