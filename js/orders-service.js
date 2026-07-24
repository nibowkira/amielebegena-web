/**
 * Amiele Begena — Orders Service Layer
 * Secure guest checkout API coordinator interfacing with Supabase Edge Function & RPC.
 */

(function () {
    'use strict';

    const OrdersService = {
        /**
         * Create guest order via Supabase Edge Function API / RPC.
         */
        async createGuestOrder(orderPayload) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                return {
                    success: false,
                    error: 'Database service is currently unavailable. Please refresh and try again.'
                };
            }

            // 1. Try Supabase Edge Function invoke
            try {
                const { data, error } = await client.functions.invoke('create-guest-order', {
                    body: orderPayload
                });

                if (!error && data && data.success) {
                    return data;
                }
                if (data && data.error) {
                    console.warn('[Amiele:Orders] Edge Function validation error:', data.error);
                }
            } catch (efError) {
                console.warn('[Amiele:Orders] Edge Function invoke failed, trying RPC fallback:', efError);
            }

            // 2. RPC fallback to PostgreSQL security definer function create_guest_order
            try {
                const { data, error } = await client.rpc('create_guest_order', {
                    p_customer_name: orderPayload.customer_name,
                    p_phone: orderPayload.phone,
                    p_customer_email: orderPayload.customer_email || null,
                    p_country: orderPayload.country,
                    p_product_id: orderPayload.product_id || null,
                    p_product_name: orderPayload.product_name || null,
                    p_quantity: orderPayload.quantity || 1,
                    p_referral_code: orderPayload.referral_code || null,
                    p_session_id: orderPayload.session_id || null,
                    p_notes: orderPayload.notes || 'Guest WhatsApp Checkout'
                });

                if (!error && data) {
                    return data;
                } else if (error) {
                    console.error('[Amiele:Orders] RPC create_guest_order error:', error);
                    return {
                        success: false,
                        error: error.message || 'Failed to record order.'
                    };
                }
            } catch (rpcError) {
                console.error('[Amiele:Orders] RPC call failed:', rpcError);
                return {
                    success: false,
                    error: 'Server error creating order. Please check your connection and try again.'
                };
            }

            return {
                success: false,
                error: 'Order processing failed.'
            };
        },

        /**
         * Submit single product order.
         */
        async createSingleProductOrder(productId, quantity, customerId, referralCode, customerName, customerEmail, country, phone, notes, sessionId, productName) {
            return await this.createGuestOrder({
                customer_name: customerName,
                phone: phone,
                customer_email: customerEmail,
                country: country,
                product_id: productId,
                product_name: productName,
                quantity: quantity || 1,
                referral_code: referralCode,
                session_id: sessionId,
                notes: notes
            });
        },

        /**
         * Submit cart checkout order.
         */
        async createOrdersFromCart(cartItems, customerId, referralCode, customerName, customerEmail, country, phone, notes, sessionId) {
            const productNames = cartItems.map(item => `${item.quantity}x ${item.name}`).join(', ');
            const firstItem = cartItems[0] || {};

            return await this.createGuestOrder({
                customer_name: customerName,
                phone: phone,
                customer_email: customerEmail,
                country: country,
                product_id: firstItem.id,
                product_name: productNames,
                quantity: cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0),
                referral_code: referralCode,
                session_id: sessionId,
                notes: notes
            });
        }
    };

    window.OrdersService = OrdersService;
})();
