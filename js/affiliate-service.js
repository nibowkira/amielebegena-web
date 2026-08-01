/**
 * Amiele Begena — Affiliate Service Layer
 * Interfaces with Supabase to manage affiliate onboarding, metrics, and ledger logs.
 */

(function () {
    'use strict';

    const AffiliateService = {
        /**
         * Resolve the current ETB/USD exchange rate with a safe fallback of 120.
         */
        async _getExchangeRate() {
            let rate = 120;
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return rate;
            try {
                const { data, error } = await client.rpc('get_exchange_rate');
                if (!error && data && parseFloat(data) > 0) rate = parseFloat(data);
            } catch (e) {}
            return rate;
        },

        /**
         * Compute a commission amount purely from the product's own price and
         * commission_percentage. Single source of truth: never hardcode a rate.
         */
        async _computeCommission(product, quantity) {
            const qty = quantity || 1;
            const priceUSD = product && product.price ? parseFloat(product.price) : 0;
            const pct = product && product.commission_percentage != null
                ? parseFloat(product.commission_percentage)
                : 8;
            const exchangeRate = await this._getExchangeRate();
            const commissionETB = Math.round((priceUSD * qty * exchangeRate * pct) / 100);
            return {
                commissionETB,
                priceUSD,
                priceETB: Math.round(priceUSD * qty * exchangeRate),
                pct
            };
        },

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
                exchangeRate = await this._getExchangeRate();
            } catch (err) {}

            // ==================================================================
            // WALLET + COMMISSION ENGINE (single source of truth = commissions)
            // ==================================================================
            let totalEarnings = 0;        // Total Earned (all lifecycle)
            let pendingCommission = 0;    // Reserved, order not yet delivered
            let availableCommission = 0;  // Delivered, withdrawable
            let withdrawn = 0;            // Locked into a pending payout request
            let paidCommission = 0;       // Paid out
            let totalOrders = 0;
            let paidOrders = 0;
            let grossVolume = 0;
            let revenueGenerated = 0;
            let topProduct = null;
            let avgCommission = 0;
            let totalCommission = 0;

            try {
                const { data: comms, error: commErr } = await client
                    .from('commissions')
                    .select('amount, status, withdrawal_id')
                    .eq('affiliate_id', userId);

                if (!commErr && comms) {
                    comms.forEach(c => {
                        const amt = parseFloat(c.amount || 0);
                        totalCommission += amt;
                        if (c.status === 'pending' || c.status === 'approved' && c.withdrawal_id) {
                            pendingCommission += amt;
                        } else if (c.status === 'available' && !c.withdrawal_id) {
                            availableCommission += amt;
                        } else if (c.status === 'available' && c.withdrawal_id) {
                            withdrawn += amt;
                        } else if (c.status === 'paid') {
                            paidCommission += amt;
                        } else if (c.status === 'approved') {
                            availableCommission += amt;
                        }
                    });
                }
                totalEarnings = totalCommission;
            } catch (err) {
                console.warn('[Amiele:Affiliate] Error fetching commissions for wallet:', err);
            }

            // Order-level stats (revenue, orders, top product, conversion)
            try {
                const { data: allReferredOrders, error: ordErr } = await client
                    .from('orders')
                    .select('quantity, payment_status, status, fulfillment_status, product:products(name, price, commission_percentage)')
                    .or(`affiliate_id.eq.${userId},referral_code.eq.${code}`);

                if (!ordErr && allReferredOrders) {
                    totalOrders = allReferredOrders.length;
                    const productMap = {};

                    allReferredOrders.forEach(o => {
                        const priceUSD = o.product ? parseFloat(o.product.price) : 100;
                        const orderAmountETB = priceUSD * (o.quantity || 1) * exchangeRate;
                        grossVolume += orderAmountETB;

                        const isPaidOrder = o.payment_status === 'paid' || ['confirmed', 'shipped', 'delivered'].includes(String(o.status || '').toLowerCase());
                        if (isPaidOrder) {
                            paidOrders++;
                            revenueGenerated += orderAmountETB;
                        }

                        if (o.product && o.product.name) {
                            productMap[o.product.name] = (productMap[o.product.name] || 0) + (o.quantity || 1);
                        }
                    });

                    const topName = Object.keys(productMap).sort((a, b) => productMap[b] - productMap[a])[0];
                    if (topName) {
                        topProduct = { name: topName, unitsSold: productMap[topName] };
                    }
                }
            } catch (e) {
                console.warn('[Amiele:Affiliate] Error fetching orders:', e);
            }

            let totalSalesCount = Math.max(aff.sales_count || 0, paidOrders);
            avgCommission = totalCommission > 0 && totalSalesCount > 0 ? Math.round(totalCommission / totalSalesCount) : 0;

            let totalPaid = paidCommission + withdrawn;

            try {
                const { data: withdrawals, error: wthErr } = await client
                    .from('affiliate_withdrawals')
                    .select('amount, status')
                    .eq('affiliate_id', userId);

                if (!wthErr && withdrawals) {
                    totalPaid = withdrawals
                        .filter(w => w.status === 'paid')
                        .reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
                }
            } catch (wthErr) {}

            const balance = Math.max(0, availableCommission);
            const conversionRate = totalClicks > 0 ? Math.round((paidOrders / totalClicks) * 1000) / 10 : 0;

            const dashboardStats = {
                userId,
                code,
                couponCode: code.toUpperCase() + '5',
                tier: totalSalesCount >= 30 ? 'gold' : (totalSalesCount >= 10 ? 'silver' : 'bronze'),
                balance,
                totalEarnings,
                pendingCommission,
                availableCommission,
                withdrawn,
                paidCommission,
                totalPaid,
                totalCommission,
                sales: totalSalesCount,
                totalOrders: Math.max(totalOrders, totalSalesCount),
                grossVolume,
                revenueGenerated,
                conversionRate,
                topProduct,
                averageCommission: avgCommission,
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
         * Fetch the full commission history ledger with product price, commission %,
         * customer, order status and lifecycle status. Single source of truth is the
         * products table (price + commission_percentage) used at attribution time.
         */
        async getCommissionsLedger(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return [];

            let refCode = '';
            try {
                const { data: affRec } = await client.from('affiliates').select('referral_code').eq('user_id', userId).maybeSingle();
                if (affRec) refCode = affRec.referral_code || '';
            } catch (e) {}

            let ordersQuery = client.from('orders').select(`
                id,
                order_number,
                customer_name,
                quantity,
                status,
                payment_status,
                fulfillment_status,
                created_at,
                product:products(name, price, commission_percentage)
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

            const { data: withdrawals, error: wthErr } = await client
                .from('affiliate_withdrawals')
                .select('id, status, processed_at, created_at')
                .eq('affiliate_id', userId);
            const wthMap = {};
            if (!wthErr && withdrawals) {
                withdrawals.forEach(w => {
                    wthMap[w.id] = w;
                });
            }

            const exchangeRate = await this._getExchangeRate();

            return orders.map(o => {
                const qty = o.quantity || 1;
                const product = o.product || {};
                const priceUSD = parseFloat(product.price || 0);
                const priceETB = Math.round(priceUSD * qty * exchangeRate);
                const pct = product.commission_percentage != null
                    ? parseFloat(product.commission_percentage)
                    : 8;

                let commissionAmount = Math.round((priceUSD * qty * exchangeRate * pct) / 100);
                let status = 'pending';
                let withdrawalId = null;

                if (commMap[o.id]) {
                    const c = commMap[o.id];
                    commissionAmount = parseFloat(c.amount);
                    status = c.status || 'pending';
                    withdrawalId = c.withdrawal_id || null;
                } else if (o.payment_status === 'pending_payment') {
                    status = 'pending';
                } else if (o.status === 'cancelled' || o.fulfillment_status === 'Cancelled') {
                    status = 'rejected';
                }

                // Map legacy 'approved' -> 'available' for display consistency
                if (status === 'approved') status = 'available';

                const orderStatus = o.fulfillment_status || o.status || 'pending';
                const withdrawal = withdrawalId ? (wthMap[withdrawalId] || null) : null;

                return {
                    id: 'comm_' + o.id.slice(0, 8),
                    orderId: o.order_number || ('#HA-' + o.id.slice(0, 4).toUpperCase()),
                    customerName: o.customer_name || 'Guest Customer',
                    productName: product.name ? `${o.product.name}${qty > 1 ? ' ×' + qty : ''}` : 'Ethiopian Instrument',
                    productPrice: priceETB,
                    priceUSD,
                    quantity: qty,
                    commissionPct: pct,
                    commissionAmount,
                    status,
                    orderStatus: orderStatus || 'Pending',
                    createdAt: o.created_at,
                    withdrawalStatus: withdrawal ? withdrawal.status : null,
                    withdrawalProcessedAt: withdrawal ? (withdrawal.processed_at || null) : null,
                    withdrawalDate: withdrawal ? (withdrawal.created_at || null) : null
                };
            });
        },

        /**
         * Wallet summary for the affiliate dashboard.
         */
        async getWallet(userId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !userId) return null;

            const { data: comms, error } = await client
                .from('commissions')
                .select('amount, status, withdrawal_id')
                .eq('affiliate_id', userId);

            const wallet = { totalEarned: 0, pending: 0, available: 0, withdrawn: 0, paid: 0 };
            if (!error && comms) {
                comms.forEach(c => {
                    const amt = parseFloat(c.amount || 0);
                    wallet.totalEarned += amt;
                    if (c.status === 'pending') wallet.pending += amt;
                    else if (c.status === 'available' && !c.withdrawal_id) wallet.available += amt;
                    else if (c.status === 'available' && c.withdrawal_id) wallet.withdrawn += amt;
                    else if (c.status === 'paid') wallet.paid += amt;
                    else if (c.status === 'approved') wallet.available += amt;
                });
            }
            wallet.balance = wallet.available;
            return wallet;
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
                rawId: w.id,
                amount: parseFloat(w.amount),
                method: w.method,
                phone: w.phone,
                account: w.account || '',
                status: w.status,
                createdAt: w.created_at,
                processedAt: w.processed_at
            }));
        },

        /**
         * Submit a withdrawal payout request.
         * Rules: minimum 500 ETB and only 'available' commissions can be withdrawn.
         * The requested amount is locked against available commissions so the same
         * commission can never be withdrawn twice (single source of truth).
         */
        async requestWithdrawal(userId, amount, method, phone, account) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            if (!amount || amount < 500) {
                throw new Error('Minimum withdrawal is 500 ETB. / በትንሹ 500 ብር ያስፈልጋል።');
            }

            const wallet = await this.getWallet(userId);
            if (!wallet || amount > wallet.available) {
                throw new Error('You need at least 500 ETB available before requesting a withdrawal. / በቂ ያልሆነ ገንዘብ።');
            }

            const { data, error } = await client
                .from('affiliate_withdrawals')
                .insert({
                    affiliate_id: userId,
                    amount: amount,
                    method: method,
                    phone: phone,
                    account: account || null,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Lock available commissions into this withdrawal (greedy, oldest first)
            try {
                const { data: availComms } = await client
                    .from('commissions')
                    .select('id, amount')
                    .eq('affiliate_id', userId)
                    .eq('status', 'available')
                    .is('withdrawal_id', null)
                    .order('created_at', { ascending: true });

                if (availComms && availComms.length > 0) {
                    let remaining = amount;
                    const toLock = [];
                    for (const c of availComms) {
                        if (remaining <= 0) break;
                        toLock.push(c.id);
                        remaining -= parseFloat(c.amount || 0);
                    }
                    if (toLock.length > 0) {
                        await client
                            .from('commissions')
                            .update({ withdrawal_id: data.id, updated_at: new Date().toISOString() })
                            .in('id', toLock);
                    }
                }
            } catch (lockErr) {
                console.warn('[Amiele:Affiliate] Warning: could not lock commissions to withdrawal:', lockErr);
            }

            return {
                id: 'wth_' + data.id.slice(0, 8),
                rawId: data.id,
                amount: parseFloat(data.amount),
                method: data.method,
                phone: data.phone,
                account: data.account || '',
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
                    product:products(price, commission_percentage)
                `)
                .eq('affiliate_id', userId)
                .neq('status', 'cancelled');

            if (error || !orders) {
                return [0, 0, 0, 0, 0, currentTotalEarnings];
            }

            const monthBuckets = Array(6).fill(0);
            const now = new Date();
            const exchangeRate = 120;

            orders.forEach(o => {
                const orderDate = new Date(o.created_at);
                const monthDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());

                if (monthDiff >= 0 && monthDiff < 6) {
                    const priceUSD = o.product ? parseFloat(o.product.price) : 0;
                    const pct = o.product && o.product.commission_percentage != null
                        ? parseFloat(o.product.commission_percentage)
                        : 8;
                    const orderAmountETB = priceUSD * o.quantity * exchangeRate;
                    const commission = Math.round((orderAmountETB * pct) / 100);

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
