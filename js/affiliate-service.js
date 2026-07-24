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
         * Resolve metadata and performance stats for an affiliate.
         */
        async getAffiliateMetadata(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            let aff = null;

            if (client) {
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
            }

            // Local DB fallback stats
            let localMeta = null;
            if (window.AmieleDB) {
                try {
                    localMeta = window.AmieleDB.getAffiliateMetadata(userId);
                } catch (e) {
                    console.warn('[Amiele:Affiliate] Local metadata fetch error:', e);
                }
            }

            if (!aff && !localMeta) {
                return null;
            }

            const code = aff ? aff.referral_code : (localMeta ? localMeta.code : 'alem-3947');

            // Fetch Supabase stats via RPC
            let stats = { sales: 0, total_orders: 0, tier: 'bronze', commission_rate: 0.10, clicks: 0, unique_clicks: 0, clicks_today: 0, clicks_week: 0, clicks_month: 0, clicks_year: 0 };
            if (client && aff) {
                try {
                    const { data, error } = await client.rpc('get_affiliate_dashboard_stats', { user_id_val: userId });
                    if (!error && data) stats = data;
                } catch (err) {
                    console.error('[Amiele:Affiliate] Error fetching stats via RPC:', err);
                }
            }

            let exchangeRate = 120;
            if (client) {
                try {
                    const { data, error } = await client.rpc('get_exchange_rate');
                    if (!error && data) exchangeRate = parseFloat(data);
                } catch (err) {
                    console.error('[Amiele:Affiliate] Error fetching exchange rate:', err);
                }
            }

            // Calculate pending & approved commissions from Supabase
            let pendingCommission = 0;
            let totalEarnings = 0;
            let totalPaid = 0;

            if (client && aff) {
                try {
                    const { data: orders } = await client
                        .from('orders')
                        .select('quantity, payment_status, product:products(price)')
                        .eq('affiliate_id', userId);

                    const activeOrders = orders || [];
                    activeOrders.filter(o => o.payment_status === 'pending_payment').forEach(o => {
                        const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                        const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                        pendingCommission += orderAmountETB * stats.commission_rate;
                    });
                } catch (e) {}

                try {
                    const { data: comms } = await client
                        .from('commissions')
                        .select('amount')
                        .eq('affiliate_id', userId)
                        .eq('status', 'approved');

                    if (comms && comms.length > 0) {
                        totalEarnings = comms.reduce((sum, c) => sum + parseFloat(c.amount), 0);
                        stats.sales = Math.max(stats.sales || 0, comms.length);
                        stats.total_orders = Math.max(stats.total_orders || 0, comms.length);
                    }
                } catch (err) {}

                try {
                    const { data: withdrawals } = await client
                        .from('affiliate_withdrawals')
                        .select('amount, status')
                        .eq('affiliate_id', userId);

                    if (withdrawals) {
                        totalPaid = withdrawals
                            .filter(w => w.status === 'approved' || w.status === 'paid')
                            .reduce((sum, w) => sum + parseFloat(w.amount), 0);
                    }
                } catch (wthErr) {}
            }

            // Merge local storage metadata and local commissions if available
            try {
                const localComms = JSON.parse(localStorage.getItem('amiele_commissions')) || [];
                const approvedLocal = localComms.filter(c => c.status === 'approved' || c.status === 'paid');
                if (approvedLocal.length > 0) {
                    const localSum = approvedLocal.reduce((sum, c) => sum + (c.commissionAmount || c.amount || 0), 0);
                    totalEarnings = Math.max(totalEarnings, localSum);
                    stats.sales = Math.max(stats.sales, approvedLocal.length);
                    stats.total_orders = Math.max(stats.total_orders, approvedLocal.length);
                }
            } catch (e) {}

            if (localMeta) {
                totalEarnings = Math.max(totalEarnings, localMeta.totalEarnings || 0);
                pendingCommission = Math.max(pendingCommission, localMeta.pendingCommission || 0);
                totalPaid = Math.max(totalPaid, localMeta.totalPaid || 0);
                stats.sales = Math.max(stats.sales, localMeta.sales || 0);
                stats.total_orders = Math.max(stats.total_orders, localMeta.totalOrders || 0);
                stats.clicks = Math.max(stats.clicks, localMeta.clicks || 0);
                stats.unique_clicks = Math.max(stats.unique_clicks, localMeta.uniqueClicks || 0);
                stats.clicks_today = Math.max(stats.clicks_today, localMeta.clicksToday || 0);
                stats.clicks_week = Math.max(stats.clicks_week, localMeta.clicksWeek || 0);
                stats.clicks_month = Math.max(stats.clicks_month, localMeta.clicksMonth || 0);
                stats.clicks_year = Math.max(stats.clicks_year, localMeta.clicksYear || 0);
            }

            const balance = Math.max(0, totalEarnings - totalPaid);

            return {
                userId,
                code,
                couponCode: code.toUpperCase() + '5',
                tier: stats.tier || (localMeta ? localMeta.tier : 'bronze'),
                balance,
                totalEarnings,
                pendingCommission,
                totalPaid,
                sales: stats.sales,
                totalOrders: stats.total_orders,
                clicks: stats.clicks,
                uniqueClicks: stats.unique_clicks,
                clicksToday: stats.clicks_today,
                clicksWeek: stats.clicks_week,
                clicksMonth: stats.clicks_month,
                clicksYear: stats.clicks_year
            };
        },

        /**
         * Fetch commissions ledger list.
         */
        async getCommissionsLedger(userId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            // Fetch orders
            const { data: orders, error: ordersErr } = await client
                .from('orders')
                .select(`
                    id,
                    order_number,
                    quantity,
                    status,
                    payment_status,
                    created_at,
                    product:products(name, price)
                `)
                .eq('affiliate_id', userId)
                .order('created_at', { ascending: false });

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
