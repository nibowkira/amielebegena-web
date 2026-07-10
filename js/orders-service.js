/**
 * Amiele Begena — Orders Service Layer
 * Coordinates checkout order persistence and attributes referral commissions.
 */

(function () {
    'use strict';

    const OrdersService = {
        /**
         * Submit cart checkout details to Supabase.
         */
        async createOrdersFromCart(cartItems, customerId = null, referralCode = null, notes = null) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // 1. Resolve affiliate identifier from referral code if provided
            let affiliateId = null;
            if (referralCode) {
                try {
                    const { data: aff, error: affErr } = await client
                        .from('affiliates')
                        .select('user_id')
                        .eq('referral_code', referralCode.trim())
                        .maybeSingle();

                    if (!affErr && aff) {
                        affiliateId = aff.user_id;
                    }
                } catch (e) {
                    console.warn('[Amiele:Orders] Error resolving affiliate code:', e);
                }
            }

            // 2. Prepare order row objects
            const orderRows = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                customer_id: customerId || null,
                affiliate_id: affiliateId,
                status: 'pending',
                notes: notes || 'Web Checkout'
            }));

            // 3. Batch insert rows
            const { data, error } = await client
                .from('orders')
                .insert(orderRows)
                .select();

            if (error) throw error;
            return data;
        },

        /**
         * Retrieve order history for a specific customer profile.
         */
        async getUserOrders(customerId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data, error } = await client
                .from('orders')
                .select(`
                    id,
                    quantity,
                    status,
                    notes,
                    created_at,
                    product:products(
                        name,
                        price,
                        product_images(storage_path, is_cover)
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    };

    window.OrdersService = OrdersService;
})();
