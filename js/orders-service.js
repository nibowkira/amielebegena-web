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

            // Always dynamically fetch referral code from localStorage immediately before constructing payload
            const dynamicRef = (typeof localStorage !== 'undefined')
                ? (localStorage.getItem("amiele_referral_code") || localStorage.getItem("amiele_ref_code") || orderPayload.referral_code || null)
                : (orderPayload.referral_code || null);

            const payload = {
                p_customer_name: orderPayload.customer_name,
                p_phone: orderPayload.phone,
                p_customer_email: orderPayload.customer_email || 'N/A',
                p_country: orderPayload.country,
                p_product_id: orderPayload.product_id || null,
                p_product_name: orderPayload.product_name || null,
                p_quantity: parseInt(orderPayload.quantity, 10) || 1,
                p_referral_code: dynamicRef,
                p_session_id: orderPayload.session_id || null,
                p_notes: orderPayload.notes || 'Guest WhatsApp Checkout'
            };

            console.log("Referral in localStorage:", (typeof localStorage !== 'undefined') ? localStorage.getItem("amiele_referral_code") : null);
            console.log("Outgoing referral_code:", payload.p_referral_code);
            console.log("Complete order payload:", payload);

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
        },

        /**
         * Track an order as a guest (no login required).
         * Calls the SECURITY DEFINER RPC `track_guest_order` which verifies
         * order_number + phone/email before returning tracking data.
         *
         * @param {string} orderNumber — The order number (e.g. "AMI-20260730-ABC1")
         * @param {string} contactInfo — Phone number or email for verification
         * @returns {Promise<Object>} { success, order_number, fulfillment_status, timeline, ... } or { success: false, error }
         */
        async trackOrder(orderNumber, contactInfo) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                console.error('[Amiele:Orders] Supabase client is not initialized!');
                return {
                    success: false,
                    error: 'Database connection unavailable. Please refresh and try again.'
                };
            }

            try {
                const { data, error } = await client.rpc('track_guest_order', {
                    p_order_number: orderNumber,
                    p_contact_info: contactInfo
                });

                if (error) {
                    console.error('[Amiele:Orders] Track order RPC error:', error);
                    return {
                        success: false,
                        error: error.message || 'Failed to look up order.'
                    };
                }

                return data || { success: false, error: 'No response from server.' };
            } catch (err) {
                console.error('[Amiele:Orders] Track order exception:', err);
                return {
                    success: false,
                    error: 'Server error. Please check your internet connection and try again.'
                };
            }
        },

        /**
         * Fetch current logged-in customer's orders from public.orders with filtering & pagination.
         * @param {Object} opts
         * @param {number} [opts.page=1]
         * @param {number} [opts.limit=20]
         * @param {string} [opts.status='all'] - 'all'|'pending'|'payment verified'|'preparing'|'crafting'|'packed'|'shipped'|'delivered'|'cancelled'
         * @param {string} [opts.search=''] - Order number or product search string
         * @returns {Promise<Object>} { success: true, orders: [], totalCount, page, totalPages }
         */
        async getCustomerOrders(opts = {}) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                return { success: false, error: 'Database connection unavailable.', orders: [], totalCount: 0 };
            }

            try {
                // Get authenticated session
                const { data: { session }, error: sessionErr } = await client.auth.getSession();
                if (sessionErr || !session || !session.user) {
                    return { success: false, unauthenticated: true, orders: [], totalCount: 0 };
                }

                const user = session.user;
                const page = Math.max(1, parseInt(opts.page, 10) || 1);
                const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 20));
                const from = (page - 1) * limit;
                const to = from + limit - 1;
                const statusFilter = (opts.status || 'all').toLowerCase().trim();
                const search = (opts.search || '').trim();

                // Build query scoped strictly to authenticated customer
                let query = client
                    .from('orders')
                    .select('*, product:products(id, name, price, description, product_images(storage_path, is_cover))', { count: 'exact' });

                // Match by customer_id or customer_email
                if (user.email) {
                    query = query.or(`customer_id.eq.${user.id},customer_email.eq.${user.email}`);
                } else {
                    query = query.eq('customer_id', user.id);
                }

                // Filter by fulfillment status or general status
                if (statusFilter !== 'all') {
                    if (statusFilter === 'payment verified' || statusFilter === 'verified') {
                        query = query.or('payment_status.ilike.%verified%,fulfillment_status.ilike.%payment verified%');
                    } else {
                        query = query.or(`fulfillment_status.ilike.%${statusFilter}%,status.ilike.%${statusFilter}%`);
                    }
                }

                // Search query by order_number or notes/country
                if (search) {
                    query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`);
                }

                // Order by newest first
                query = query.order('created_at', { ascending: false }).range(from, to);

                const { data, count, error } = await query;

                if (error) {
                    console.error('[Amiele:Orders] Query error:', error);
                    return { success: false, error: error.message, orders: [], totalCount: 0 };
                }

                return {
                    success: true,
                    orders: data || [],
                    totalCount: count || 0,
                    page,
                    totalPages: Math.ceil((count || 0) / limit)
                };
            } catch (err) {
                console.error('[Amiele:Orders] getCustomerOrders exception:', err);
                return { success: false, error: 'Failed to load order history.', orders: [], totalCount: 0 };
            }
        },

        /**
         * Get full details of a specific order including fulfillment audit timeline history.
         * @param {string} orderIdOrNumber
         * @returns {Promise<Object>} { success: true, order, timeline }
         */
        async getOrderDetails(orderIdOrNumber) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !orderIdOrNumber) {
                return { success: false, error: 'Invalid order reference.' };
            }

            try {
                // Fetch single order
                let query = client
                    .from('orders')
                    .select('*, product:products(id, name, price, description, product_images(storage_path, is_cover))');

                if (orderIdOrNumber.includes('-') && orderIdOrNumber.length < 30) {
                    query = query.eq('order_number', orderIdOrNumber);
                } else {
                    query = query.eq('id', orderIdOrNumber);
                }

                const { data: order, error } = await query.single();
                if (error || !order) {
                    return { success: false, error: error ? error.message : 'Order not found.' };
                }

                // Fetch fulfillment timeline history if table available
                let timeline = [];
                try {
                    const { data: history } = await client
                        .from('order_fulfillment_history')
                        .select('*')
                        .eq('order_id', order.id)
                        .order('created_at', { ascending: true });
                    if (history) timeline = history;
                } catch (e) {
                    console.warn('[Amiele:Orders] Timeline history query non-critical error:', e);
                }

                return {
                    success: true,
                    order,
                    timeline
                };
            } catch (err) {
                console.error('[Amiele:Orders] getOrderDetails exception:', err);
                return { success: false, error: 'Could not fetch order details.' };
            }
        },

        /**
         * Deprecated helper alias for backward compatibility.
         */
        async getUserOrders(userId) {
            const res = await this.getCustomerOrders({ page: 1, limit: 100 });
            return res.orders || [];
        }
    };

    window.OrdersService = OrdersService;
})();
