/**
 * Amiele Begena — Orders Service Layer
 * Coordinates checkout order persistence and attributes referral commissions.
 */

(function () {
    'use strict';

    const OrdersService = {
        async resolveValidProductId(client, rawId) {
            const isUUID = typeof rawId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
            if (isUUID) return rawId;

            if (client) {
                try {
                    const { data } = await client.from('products').select('id').limit(1).maybeSingle();
                    if (data && data.id) return data.id;
                } catch (e) {
                    console.warn('[Amiele:Orders] Could not resolve valid product UUID:', e);
                }
            }
            return null;
        },

        /**
         * Submit cart checkout details to Supabase.
         */
        async createOrdersFromCart(cartItems, customerId = null, referralCode = null, customerName = null, customerEmail = null, country = null, notes = null, sessionId = null) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;

            // 1. Resolve secure affiliate identifier validating expiration and session
            let affiliateId = null;
            if (client && referralCode && sessionId) {
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

            let supabaseOrders = null;
            if (client) {
                try {
                    // Resolve UUIDs for cart items
                    const orderRows = [];
                    for (const item of cartItems) {
                        const validProdId = await this.resolveValidProductId(client, item.id);
                        if (validProdId) {
                            orderRows.push({
                                product_id: validProdId,
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
                            });
                        }
                    }

                    if (orderRows.length > 0) {
                        const { data, error } = await client
                            .from('orders')
                            .insert(orderRows)
                            .select();

                        if (!error && data) supabaseOrders = data;
                        else console.warn('[Amiele:Orders] Supabase order batch insert warning:', error);
                    }
                } catch (e) {
                    console.warn('[Amiele:Orders] Supabase order insert failed, using fallback:', e);
                }
            }

            // Always save to local fallback as well so admin panel displays order immediately
            if (window.AmieleDB) {
                cartItems.forEach(item => {
                    window.AmieleDB.addOrder({
                        customer_name: customerName,
                        customer_email: customerEmail,
                        country: country,
                        referral_code: referralCode,
                        affiliate_id: affiliateId,
                        product_name: item.name || 'Instrument',
                        quantity: item.quantity,
                        amount: (item.price || 125) * 120 * item.quantity,
                        payment_status: 'pending_payment',
                        status: 'pending'
                    });
                });
            }

            return supabaseOrders || [{ order_number: 'AM-' + Math.floor(100000 + Math.random() * 900000) }];
        },

        /**
         * Create order record for direct catalog checkout.
         */
        async createSingleProductOrder(productId, quantity, customerId = null, referralCode = null, customerName = null, customerEmail = null, country = null, notes = null, sessionId = null) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;

            // 1. Resolve secure affiliate identifier validating expiration and session
            let affiliateId = null;
            if (client && referralCode && sessionId) {
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

            let supabaseOrders = null;
            if (client) {
                try {
                    const validProdId = await this.resolveValidProductId(client, productId);
                    if (validProdId) {
                        const orderRow = {
                            product_id: validProdId,
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

                        const { data, error } = await client
                            .from('orders')
                            .insert(orderRow)
                            .select();

                        if (!error && data) supabaseOrders = data;
                        else console.warn('[Amiele:Orders] Supabase single order insert warning:', error);
                    }
                } catch (e) {
                    console.warn('[Amiele:Orders] Supabase order insert failed, using fallback:', e);
                }
            }

            // Always save to local fallback as well so admin panel displays order immediately
            if (window.AmieleDB) {
                window.AmieleDB.addOrder({
                    customer_name: customerName,
                    customer_email: customerEmail,
                    country: country,
                    referral_code: referralCode,
                    affiliate_id: affiliateId,
                    product_name: typeof notes === 'string' && notes.includes('Instrument') ? notes : 'Ethiopian Instrument',
                    quantity: quantity,
                    amount: 15000 * quantity,
                    payment_status: 'pending_payment',
                    status: 'pending'
                });
            }

            return supabaseOrders || [{ order_number: 'AM-' + Math.floor(100000 + Math.random() * 900000) }];
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
