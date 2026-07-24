/**
 * Amiele Begena — Orders Service Layer
 * Secure guest checkout API coordinator calling PostgreSQL RPC function create_guest_order.
 */

(function () {
    'use strict';

    const OrdersService = {
        /**
         * Create guest order via PostgreSQL SECURITY DEFINER RPC API function.
         */
        async createGuestOrder(orderPayload) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                console.error('[Amiele:Orders] Supabase client is not initialized!');
                return {
                    success: false,
                    error: 'Database connection unavailable. Please refresh and try again.'
                };
            }

            const payload = {
                p_customer_name: orderPayload.customer_name,
                p_phone: orderPayload.phone,
                p_customer_email: orderPayload.customer_email || 'N/A',
                p_country: orderPayload.country,
                p_product_id: orderPayload.product_id || null,
                p_product_name: orderPayload.product_name || null,
                p_quantity: parseInt(orderPayload.quantity, 10) || 1,
                p_referral_code: orderPayload.referral_code || null,
                p_session_id: orderPayload.session_id || null,
                p_notes: orderPayload.notes || 'Guest WhatsApp Checkout'
            };

            console.log('[Amiele:RPC] Outgoing RPC Payload:', payload);

            try {
                const { data, error } = await client.rpc('create_guest_order', payload);

                console.log('[Amiele:RPC] Response Data:', data);
                if (error) {
                    console.error('[Amiele:RPC] Response Error:', error);
                }

                if (!error && data) {
                    return data;
                } else if (error) {
                    return {
                        success: false,
                        error: error.message || 'Failed to record order in database.'
                    };
                }
            } catch (err) {
                console.error('[Amiele:RPC] RPC call exception:', err);
                return {
                    success: false,
                    error: 'Server error processing order. Please check your internet connection.'
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
            console.log('[Amiele:Orders] createSingleProductOrder called for:', productName || productId);
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
            console.log('[Amiele:Orders] createOrdersFromCart called with items count:', cartItems.length);
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
