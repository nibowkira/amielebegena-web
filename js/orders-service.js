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
        async createOrdersFromCart(cartItems, customerId = null, referralCode = null, customerName = null, customerEmail = null, country = null, notes = null, sessionId = null) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // 1. Resolve secure affiliate identifier validating expiration and session
            let affiliateId = null;
            if (referralCode && sessionId) {
                try {
                    const { data, error } = await client.rpc('resolve_valid_affiliate', { 
                        code_val: referralCode.trim(), 
                        session_val: sessionId 
                    });
                    
                    if (!error && data) {
                        affiliateId = data;
                    }
                } catch (e) {
                    console.warn('[Amiele:Orders] Error securely resolving affiliate code:', e);
                }
            }

            // 2. Prepare order row objects
            const orderRows = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                customer_id: customerId || null,
                affiliate_id: affiliateId,
                status: 'pending',
                notes: notes || 'Web Checkout',
                customer_name: customerName,
                customer_email: customerEmail,
                country: country,
                referral_code: referralCode,
                payment_status: 'pending_payment'
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
         * Create order record for direct catalog checkout.
         */
        async createSingleProductOrder(productId, quantity, customerId = null, referralCode = null, customerName = null, customerEmail = null, country = null, notes = null, sessionId = null) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            // 1. Resolve secure affiliate identifier validating expiration and session
            let affiliateId = null;
            if (referralCode && sessionId) {
                try {
                    const { data, error } = await client.rpc('resolve_valid_affiliate', { 
                        code_val: referralCode.trim(), 
                        session_val: sessionId 
                    });
                    
                    if (!error && data) {
                        affiliateId = data;
                    }
                } catch (e) {
                    console.warn('[Amiele:Orders] Error securely resolving affiliate code:', e);
                }
            }

            // 2. Prepare order row
            const orderRow = {
                product_id: productId,
                quantity: quantity,
                customer_id: customerId || null,
                affiliate_id: affiliateId,
                status: 'pending',
                notes: notes || 'Direct Checkout',
                customer_name: customerName,
                customer_email: customerEmail,
                country: country,
                referral_code: referralCode,
                payment_status: 'pending_payment'
            };

            // 3. Insert row
            const { data, error } = await client
                .from('orders')
                .insert(orderRow)
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
