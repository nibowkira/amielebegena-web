/**
 * Amiele Begena — Admin Service Layer
 * Coordinates back-office administration tasks: user roles, affiliate applications, referred sales, and payouts.
 */

(function () {
    'use strict';

    const AdminService = {
        /**
         * Fetch all user profiles from Supabase.
         */
        async getUsers() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },

        /**
         * Update the role of a user profile in Supabase.
         */
        async changeUserRole(userId, newRole) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Fetch all affiliate applications from Supabase, joining applicant profiles.
         */
        async getApplications() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('affiliate_applications')
                .select(`
                    *,
                    profile:profiles(name, email)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(app => ({
                id: 'app_' + app.user_id.slice(0, 8),
                userId: app.user_id,
                name: app.profile ? app.profile.name : 'Unknown User',
                phone: 'N/A', // phone is in profile metadata or application motivation
                country: 'ET',
                socials: {
                    instagram: app.social_link && app.social_link.includes('instagram') ? app.social_link : '',
                    tiktok: app.social_link && app.social_link.includes('tiktok') ? app.social_link : '',
                    youtube: app.social_link && app.social_link.includes('youtube') ? app.social_link : ''
                },
                whyApply: app.motivation,
                status: app.status,
                submittedAt: app.created_at
            }));
        },

        /**
         * Approve an affiliate application.
         * The database trigger automatically creates an affiliate record and upgrades their role.
         */
        async approveApplication(userId, reviewerId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('affiliate_applications')
                .update({
                    status: 'approved',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Reject an affiliate application.
         */
        async rejectApplication(userId, reviewerId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('affiliate_applications')
                .update({
                    status: 'rejected',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Fetch all referred sales/orders from Supabase to review commissions.
         */
        async getReferredSales() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data: orders, error } = await client
                .from('orders')
                .select(`
                    id,
                    quantity,
                    status,
                    created_at,
                    affiliate_id,
                    product:products(name, price)
                `)
                .not('affiliate_id', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Gather all active affiliate referral codes
            const { data: affiliates, error: affErr } = await client
                .from('affiliates')
                .select('user_id, referral_code');

            const codeMap = {};
            if (!affErr && affiliates) {
                affiliates.forEach(a => { codeMap[a.user_id] = a.referral_code; });
            }

            const exchangeRate = 120;
            // Determine commission rates (defaulting to 10% for admin display)
            return orders.map(o => {
                const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                const commission = orderAmountETB * 0.10;

                return {
                    id: o.id,
                    affiliateId: codeMap[o.affiliate_id] || o.affiliate_id,
                    orderId: '#HA-' + o.id.slice(0, 4).toUpperCase(),
                    productName: o.product ? `${o.quantity}x ${o.product.name}` : 'Instrument',
                    orderAmount: orderAmountETB,
                    commissionAmount: commission,
                    status: o.status,
                    createdAt: o.created_at
                };
            });
        },

        /**
         * Update referred order status.
         */
        async updateOrderStatus(orderId, newStatus) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    };

    window.AdminService = AdminService;
})();
