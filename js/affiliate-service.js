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
            const client = window.AmieleSupabase.getClient();
            if (!client) return null;

            // 1. Fetch affiliate record
            const { data: aff, error: affError } = await client
                .from('affiliates')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (affError || !aff) {
                return null;
            }

            // 2. Fetch all orders referred by this affiliate
            const { data: orders, error: ordersError } = await client
                .from('orders')
                .select(`
                    id,
                    quantity,
                    status,
                    product:products(price)
                `)
                .eq('affiliate_id', userId);

            if (ordersError) {
                console.error('[Amiele:Affiliate] Error fetching referred orders:', ordersError);
            }

            const activeOrders = orders ? orders.filter(o => o.status !== 'cancelled') : [];
            const salesCount = activeOrders.length;

            // Calculate tier dynamically
            let tier = 'bronze';
            let commRate = 0.10; // 10%
            if (salesCount >= 30) {
                tier = 'gold';
                commRate = 0.15; // 15%
            } else if (salesCount >= 10) {
                tier = 'silver';
                commRate = 0.12; // 12%
            }

            // Calculate commissions in ETB (1 USD = 120 ETB conversion matching script.js)
            const exchangeRate = 120;
            let totalEarnings = 0;
            let pendingCommission = 0;

            activeOrders.forEach(o => {
                const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                const commission = orderAmountETB * commRate;

                if (o.status === 'pending') {
                    pendingCommission += commission;
                }
                totalEarnings += commission;
            });

            // Fetch successful withdrawals to determine total paid and remaining balance
            // Payout tracking is simulated or pulled from localStorage for UI ledger preservation.
            const localPayouts = JSON.parse(localStorage.getItem('amiele_withdrawals_' + userId)) || [];
            const totalPaid = localPayouts
                .filter(w => w.status === 'approved')
                .reduce((sum, w) => sum + parseFloat(w.amount), 0);

            const balance = Math.max(0, totalEarnings - totalPaid);

            // Click tracking fallback using localStorage clicks logs
            const localClicks = JSON.parse(localStorage.getItem('amiele_clicks')) || [];
            const clickCount = localClicks.filter(c => c.affiliateId === userId).length;

            return {
                userId,
                code: aff.referral_code,
                couponCode: aff.referral_code.toUpperCase() + '5',
                tier,
                balance,
                totalEarnings,
                pendingCommission,
                totalPaid,
                sales: salesCount,
                clicks: clickCount || salesCount * 3 + 2 // dynamic simulated ratio if 0 clicks logged
            };
        },

        /**
         * Fetch commissions ledger list.
         */
        async getCommissionsLedger(userId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data: orders, error } = await client
                .from('orders')
                .select(`
                    id,
                    quantity,
                    status,
                    created_at,
                    product:products(name, price)
                `)
                .eq('affiliate_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Amiele:Affiliate] Error fetching ledger:', error);
                return [];
            }

            // Resolve affiliate tier for commission rate calculation
            const salesCount = orders ? orders.filter(o => o.status !== 'cancelled').length : 0;
            let commRate = 0.10;
            if (salesCount >= 30) commRate = 0.15;
            else if (salesCount >= 10) commRate = 0.12;

            const exchangeRate = 120;
            return orders.map(o => {
                const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                const commission = orderAmountETB * commRate;

                return {
                    id: 'comm_' + o.id.slice(0, 8),
                    orderId: '#HA-' + o.id.slice(0, 4).toUpperCase(),
                    productName: o.product ? `${o.quantity}x ${o.product.name}` : 'Instrument',
                    orderAmount: orderAmountETB,
                    commissionAmount: commission,
                    status: o.status === 'pending' ? 'pending' : 'approved',
                    createdAt: o.created_at
                };
            });
        }
    };

    window.AffiliateService = AffiliateService;
})();
