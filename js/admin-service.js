/**
 * Amiele Begena — Admin Service Layer
 * Coordinates back-office administration tasks: user roles, affiliate applications, referred sales, and payouts.
 */

(function () {
    'use strict';

    const AdminService = {
        /**
         * Fetch advanced admin analytics securely from Supabase RPC.
         */
        async getAdminAnalytics() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return null;
            try {
                const { data, error } = await client.rpc('get_admin_analytics');
                if (error) throw error;
                return data;
            } catch (e) {
                console.error('[Amiele:Admin] Error fetching admin analytics:', e);
                return null;
            }
        },

        /**
         * Fetch all user profiles, merging Supabase and LocalStorage.
         */
        async getUsers() {
            let supabaseUsers = [];
            const client = window.AmieleSupabase.getClient();
            if (client) {
                try {
                    const { data, error } = await client
                        .from('profiles')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        supabaseUsers = data;
                    }
                } catch (e) {
                    console.error('[Amiele:Admin] Supabase fetch users error:', e);
                }
            }

            let localUsers = [];
            if (window.AmieleDB) {
                try {
                    localUsers = window.AmieleDB.getUsers();
                } catch (e) {
                    console.error('[Amiele:Admin] Local users fetch error:', e);
                }
            }

            const normalizedLocal = localUsers.map(u => ({
                id: u.id,
                full_name: u.name,
                email: u.email,
                role: u.role,
                created_at: u.joinedAt || new Date().toISOString()
            }));

            const mergedMap = new Map();
            normalizedLocal.forEach(u => {
                mergedMap.set(u.id, u);
            });
            supabaseUsers.forEach(u => {
                mergedMap.set(u.id, u);
            });

            return Array.from(mergedMap.values()).map(u => ({
                id: u.id,
                name: u.full_name || u.name || 'User',
                email: u.email,
                role: u.role,
                created_at: u.created_at
            }));
        },

        /**
         * Update the role of a user profile in Supabase and/or LocalStorage.
         */
        async changeUserRole(userId, newRole) {
            const client = window.AmieleSupabase.getClient();
            let supabaseSuccess = false;
            if (client) {
                try {
                    const { data, error } = await client
                        .from('profiles')
                        .update({ role: newRole })
                        .eq('id', userId)
                        .select()
                        .single();

                    if (!error) supabaseSuccess = true;
                } catch (e) {
                    console.warn('[Amiele:Admin] Supabase role update failed:', e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const users = window.AmieleDB.getUsers();
                    const uIndex = users.findIndex(u => u.id === userId);
                    if (uIndex !== -1) {
                        users[uIndex].role = newRole;
                        window.AmieleDB.saveUsers(users);
                    }
                } catch (e) {
                    console.error('[Amiele:Admin] Local role update failed:', e);
                }
            }

            if (client && !supabaseSuccess && !window.AmieleDB) {
                throw new Error('Could not update user role.');
            }
        },

        /**
         * Fetch all affiliate applications from Supabase (two-step query to avoid join issues).
         */
        async getApplications() {
            let supabaseApps = [];
            const client = window.AmieleSupabase.getClient();
            if (client) {
                // Verify admin auth session is attached
                try {
                    const { data: { user } } = await client.auth.getUser();
                    if (!user) {
                        console.warn('[Amiele:Admin] No active auth session. RLS will block application reads!');
                    }
                } catch (e) {
                    console.warn('[Amiele:Admin] Could not verify auth session status:', e);
                }

                // Step 1: Fetch applications (no join — avoids PostgREST relationship resolution failures)
                let rawApps = [];
                try {
                    const { data, error } = await client
                        .from('affiliate_applications')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('[Amiele:Admin] Supabase applications query error:', error.message, error);
                    } else if (data) {
                        rawApps = data;
                    }
                } catch (e) {
                    console.error('[Amiele:Admin] Supabase applications fetch exception:', e);
                }

                // Step 2: Fetch profile names for the applicants
                let profileMap = {};
                if (rawApps.length > 0) {
                    try {
                        const userIds = rawApps.map(a => a.user_id);
                        const { data: profiles, error: profileError } = await client
                            .from('profiles')
                            .select('id, full_name, email')
                            .in('id', userIds);

                        if (!profileError && profiles) {
                            profiles.forEach(p => {
                                profileMap[p.id] = p;
                            });
                        } else if (profileError) {
                            console.error('[Amiele:Admin] Supabase profiles lookup error:', profileError.message);
                        }
                    } catch (e) {
                        console.error('[Amiele:Admin] Supabase profiles fetch exception:', e);
                    }
                }

                // Step 3: Map raw applications to admin-friendly format
                supabaseApps = rawApps.map(app => {
                    const profile = profileMap[app.user_id];
                    return {
                        id: 'app_' + app.user_id.slice(0, 8),
                        userId: app.user_id,
                        name: profile ? profile.full_name : 'Unknown User',
                        phone: 'N/A',
                        country: 'ET',
                        socials: {
                            instagram: app.social_link && app.social_link.includes('instagram') ? app.social_link : '',
                            tiktok: app.social_link && app.social_link.includes('tiktok') ? app.social_link : '',
                            youtube: app.social_link && app.social_link.includes('youtube') ? app.social_link : ''
                        },
                        whyApply: app.motivation,
                        status: app.status,
                        submittedAt: app.created_at
                    };
                });
            }

            // Also check local storage for any locally-submitted applications
            let localApps = [];
            if (window.AmieleDB) {
                try {
                    localApps = window.AmieleDB.getApplications().map(app => ({
                        id: app.id,
                        userId: app.userId,
                        name: app.name || 'Unknown User',
                        phone: app.phone || 'N/A',
                        country: app.country || 'ET',
                        socials: {
                            instagram: app.socials && app.socials.instagram ? app.socials.instagram : '',
                            tiktok: app.socials && app.socials.tiktok ? app.socials.tiktok : '',
                            youtube: app.socials && app.socials.youtube ? app.socials.youtube : ''
                        },
                        whyApply: app.whyApply || '',
                        status: app.status || 'pending',
                        submittedAt: app.submittedAt || new Date().toISOString()
                    }));
                } catch (e) {
                    console.error('[Amiele:Admin] Local applications fetch error:', e);
                }
            }

            // Merge: Supabase data takes priority over local duplicates
            const mergedMap = new Map();
            localApps.forEach(app => {
                mergedMap.set(app.userId, app);
            });
            supabaseApps.forEach(app => {
                mergedMap.set(app.userId, app);
            });

            const result = Array.from(mergedMap.values());
            return result;
        },

        /**
         * Approve an affiliate application.
         */
        async approveApplication(userId, reviewerId) {
            const client = window.AmieleSupabase.getClient();
            let supabaseSuccess = false;
            if (client) {
                try {
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

                    if (!error) supabaseSuccess = true;
                } catch (e) {
                    console.error('[Amiele:Admin] Supabase approve application failed:', e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const apps = window.AmieleDB.getApplications();
                    const app = apps.find(a => a.userId === userId || a.id === userId);
                    if (app) {
                        app.status = 'approved';
                        app.reviewedAt = new Date().toISOString();
                        window.AmieleDB.saveApplications(apps);

                        const users = window.AmieleDB.getUsers();
                        const user = users.find(u => u.id === app.userId);
                        if (user) {
                            user.role = 'affiliate';
                            window.AmieleDB.saveUsers(users);
                        }

                        const affiliates = window.AmieleDB.getAffiliates();
                        if (!affiliates.find(a => a.userId === app.userId)) {
                            const baseCode = app.name ? app.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) : 'AFF';
                            const randomSuffix = Math.floor(10 + Math.random() * 90);
                            affiliates.push({
                                userId: app.userId,
                                code: baseCode + randomSuffix,
                                couponCode: baseCode + '5',
                                balance: 0,
                                totalEarnings: 0,
                                pendingCommission: 0,
                                totalPaid: 0,
                                clicks: 0,
                                sales: 0,
                                tier: 'standard'
                            });
                            window.AmieleDB.saveAffiliates(affiliates);
                        }
                    }
                } catch (e) {
                    console.error('[Amiele:Admin] Local approve application failed:', e);
                }
            }

            if (client && !supabaseSuccess && !window.AmieleDB) {
                throw new Error('Could not approve application.');
            }
        },

        /**
         * Reject an affiliate application.
         */
        async rejectApplication(userId, reviewerId) {
            const client = window.AmieleSupabase.getClient();
            let supabaseSuccess = false;
            if (client) {
                try {
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

                    if (!error) supabaseSuccess = true;
                } catch (e) {
                    console.error('[Amiele:Admin] Supabase reject application failed:', e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const apps = window.AmieleDB.getApplications();
                    const app = apps.find(a => a.userId === userId || a.id === userId);
                    if (app) {
                        app.status = 'rejected';
                        app.reviewedAt = new Date().toISOString();
                        window.AmieleDB.saveApplications(apps);
                    }
                } catch (e) {
                    console.error('[Amiele:Admin] Local reject application failed:', e);
                }
            }

            if (client && !supabaseSuccess && !window.AmieleDB) {
                throw new Error('Could not reject application.');
            }
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
         * Fetch all orders (referred or organic) for Order Management tab.
         */
        async getOrders() {
            let supabaseOrders = [];
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;

            if (client) {
                try {
                    const { data: orders, error } = await client
                        .from('orders')
                        .select(`
                            id,
                            order_number,
                            customer_name,
                            customer_email,
                            phone,
                            country,
                            referral_code,
                            quantity,
                            status,
                            payment_status,
                            created_at,
                            affiliate_id,
                            product:products(name, price)
                        `)
                        .order('created_at', { ascending: false });

                    if (!error && orders) {
                        const { data: affiliates } = await client
                            .from('affiliates')
                            .select('user_id, referral_code');

                        const codeMap = {};
                        if (affiliates) {
                            affiliates.forEach(a => { codeMap[a.user_id] = a.referral_code; });
                        }

                        const exchangeRate = 120;
                        supabaseOrders = orders.map(o => {
                            const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                            const calcAmount = itemPriceUSD * o.quantity * exchangeRate;
                            
                            return {
                                id: o.id,
                                orderNumber: o.order_number || ('AM-ORD-' + String(o.id).slice(0, 4).toUpperCase()),
                                customerName: o.customer_name || 'Guest Customer',
                                customerEmail: o.customer_email || 'N/A',
                                phone: o.phone || 'N/A',
                                country: o.country || 'N/A',
                                referralCode: o.referral_code || (o.affiliate_id ? codeMap[o.affiliate_id] : 'Direct / None'),
                                affiliateId: o.affiliate_id,
                                affiliateCode: codeMap[o.affiliate_id] || o.referral_code || 'None',
                                productName: o.product ? `${o.quantity}x ${o.product.name}` : `${o.quantity || 1}x Instrument`,
                                orderAmount: calcAmount > 0 ? calcAmount : 15000,
                                paymentStatus: o.payment_status || 'pending_payment',
                                orderStatus: o.status || 'pending',
                                createdAt: o.created_at
                            };
                        });
                    } else if (error) {
                        console.warn('[Amiele:Admin] Error querying Supabase orders:', error);
                    }
                } catch (e) {
                    console.warn('[Amiele:Admin] Exception fetching Supabase orders:', e);
                }
            }

            return supabaseOrders;
        },

        async clearAllOrders() {
            localStorage.setItem('amiele_orders_cleared', 'true');
            if (window.AmieleDB && typeof window.AmieleDB.resetOrdersData === 'function') {
                window.AmieleDB.resetOrdersData();
            }

            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (client) {
                try {
                    await client.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                } catch (e) {
                    console.warn('[Amiele:Admin] Remote orders delete warning:', e);
                }
            }
            return true;
        },

        /**
         * Securely approve order payment in Supabase:
         * 1. Read existing order record
         * 2. Resolve affiliate_id from referral_code if NULL
         * 3. Update orders (payment_status='paid', status='confirmed', affiliate_id)
         * 4. Create commission row (preventing duplicates)
         * 5. Increment affiliates.sales_count by +1
         */
        async approvePayment(orderId) {
            console.log("START approvePayment for order:", orderId);

            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                const err = new Error("Supabase database client is unavailable.");
                console.error("Client Error:", err);
                throw err;
            }

            // 1. Read Order Before Update
            console.log("Before reading order");
            const { data: order, error: fetchErr } = await client
                .from('orders')
                .select('id, order_number, customer_name, referral_code, affiliate_id, quantity, product_id, payment_status, status, product:products(price)')
                .eq('id', orderId)
                .single();

            if (fetchErr) {
                console.error("Supabase Order Fetch Error:", fetchErr);
                throw new Error("Failed to read order from Supabase: " + fetchErr.message);
            }

            console.log("Order loaded:", order);

            // 2. Resolve Affiliate Record if affiliate_id is NULL
            console.log("Before affiliate lookup");
            let affiliateId = order.affiliate_id;
            let affiliateRec = null;

            if (!affiliateId && order.referral_code) {
                const cleanCode = String(order.referral_code).trim();
                const { data: affData, error: affErr } = await client
                    .from('affiliates')
                    .select('user_id, referral_code, sales_count')
                    .ilike('referral_code', cleanCode)
                    .maybeSingle();

                if (affErr) {
                    console.error("Supabase Affiliate Lookup Error:", affErr);
                    throw new Error("Failed to query affiliate by referral_code: " + affErr.message);
                } else if (affData) {
                    affiliateRec = affData;
                    affiliateId = affData.user_id;
                    console.log("Affiliate found:", affiliateRec);
                } else {
                    console.warn("No matching affiliate found in DB for referral code:", cleanCode);
                }
            } else if (affiliateId) {
                const { data: affData, error: affErr } = await client
                    .from('affiliates')
                    .select('user_id, referral_code, sales_count')
                    .eq('user_id', affiliateId)
                    .maybeSingle();

                if (affErr) {
                    console.error("Supabase Affiliate Fetch Error:", affErr);
                    throw new Error("Failed to fetch affiliate record: " + affErr.message);
                } else if (affData) {
                    affiliateRec = affData;
                    console.log("Affiliate found:", affiliateRec);
                }
            } else {
                console.log("No referral code or affiliate_id associated with order.");
            }

            // 3. Update Order in Supabase
            console.log("Before updating order");
            const updatePayload = {
                payment_status: 'paid',
                status: 'confirmed',
                updated_at: new Date().toISOString()
            };
            if (affiliateId) {
                updatePayload.affiliate_id = affiliateId;
            }

            const { data: updatedOrder, error: updateErr } = await client
                .from('orders')
                .update(updatePayload)
                .eq('id', orderId)
                .select('*')
                .single();

            if (updateErr) {
                console.error("Supabase Order Update Error:", updateErr);
                throw new Error("Failed to update order in Supabase: " + updateErr.message);
            }

            console.log("Order updated:", updatedOrder);

            // 4. Create Commission & Increment Affiliate Sales Count
            let commission = null;
            let commAmount = 1200;

            if (affiliateId) {
                const itemPriceUSD = (order.product && order.product.price) ? parseFloat(order.product.price) : 100;
                const orderAmountETB = itemPriceUSD * (order.quantity || 1) * 120;
                commAmount = Math.max(1200, Math.round(orderAmountETB * 0.10));

                console.log("Before inserting commission");

                // Check for existing commission to prevent duplicates
                const { data: existingComm, error: existingCommErr } = await client
                    .from('commissions')
                    .select('*')
                    .eq('order_id', orderId)
                    .maybeSingle();

                if (existingCommErr) {
                    console.error("Supabase Commission Lookup Error:", existingCommErr);
                    throw new Error("Failed to check existing commissions: " + existingCommErr.message);
                }

                if (existingComm) {
                    commission = existingComm;
                    console.log("Commission inserted:", commission);
                } else {
                    const { data: newComm, error: insertCommErr } = await client
                        .from('commissions')
                        .insert({
                            affiliate_id: affiliateId,
                            order_id: orderId,
                            amount: commAmount,
                            rate: 10,
                            status: 'approved',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select('*')
                        .single();

                    if (insertCommErr) {
                        console.error("Supabase Commission Insert Error:", insertCommErr);
                        throw new Error("Failed to insert commission into Supabase: " + insertCommErr.message);
                    } else {
                        commission = newComm;
                        console.log("Commission inserted:", commission);
                    }
                }

                // 5. Increment sales_count on affiliates table
                console.log("Before updating affiliate");
                if (affiliateRec) {
                    const currentSales = (affiliateRec.sales_count && !isNaN(affiliateRec.sales_count)) ? parseInt(affiliateRec.sales_count, 10) : 0;
                    const { data: affiliateUpdate, error: affUpdateErr } = await client
                        .from('affiliates')
                        .update({
                            sales_count: currentSales + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', affiliateId)
                        .select('*')
                        .single();

                    if (affUpdateErr) {
                        console.error("Supabase Affiliate Update Error:", affUpdateErr);
                        throw new Error("Failed to update affiliate sales_count in Supabase: " + affUpdateErr.message);
                    } else {
                        console.log("Affiliate updated:", affiliateUpdate);
                    }
                }
            }

            console.log("END approvePayment");

            return {
                success: true,
                commission_attributed: !!affiliateId,
                commission_amount: commAmount
            };
        },

        /**
         * One-Time Repair System for Missing Commissions
         * Finds every paid order with an affiliate_id that lacks a commission record,
         * calculates 10% (min 1,200 ETB), and inserts the missing commission idempotently.
         */
        async repairMissingCommissions() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) throw new Error("Supabase database client is unavailable.");

            console.log("START repairMissingCommissions");

            // 1. Query paid orders with affiliate_id
            const { data: paidOrders, error: orderErr } = await client
                .from('orders')
                .select('id, affiliate_id, quantity, product_id, created_at, product:products(price)')
                .eq('payment_status', 'paid')
                .not('affiliate_id', 'is', null);

            if (orderErr) {
                console.error("Error fetching paid orders for repair:", orderErr);
                throw new Error("Failed to query paid orders: " + orderErr.message);
            }

            let missingFound = 0;
            let createdCount = 0;

            if (paidOrders && paidOrders.length > 0) {
                for (const order of paidOrders) {
                    // Check if commission already exists
                    const { data: existingComm, error: commCheckErr } = await client
                        .from('commissions')
                        .select('id')
                        .eq('order_id', order.id)
                        .maybeSingle();

                    if (commCheckErr) {
                        console.error("Error checking commission for order:", order.id, commCheckErr);
                        continue;
                    }

                    if (!existingComm) {
                        missingFound++;
                        const itemPriceUSD = (order.product && order.product.price) ? parseFloat(order.product.price) : 100;
                        const orderAmountETB = itemPriceUSD * (order.quantity || 1) * 120;
                        const commAmount = Math.max(1200, Math.round(orderAmountETB * 0.10));

                        const { data: newComm, error: insertErr } = await client
                            .from('commissions')
                            .insert({
                                affiliate_id: order.affiliate_id,
                                order_id: order.id,
                                amount: commAmount,
                                rate: 10,
                                status: 'approved',
                                created_at: order.created_at || new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .select()
                            .single();

                        if (insertErr) {
                            console.error("Failed to repair commission for order:", order.id, insertErr);
                        } else {
                            createdCount++;
                            console.log(`Repaired commission for order ${order.id}: ETB ${commAmount}`, newComm);
                        }
                    }
                }
            }

            console.log(`END repairMissingCommissions. Missing: ${missingFound}, Created: ${createdCount}`);

            return {
                paid_orders_checked: paidOrders ? paidOrders.length : 0,
                missing_found: missingFound,
                created_count: createdCount
            };
        },

        /**
         * Mark order payment as rejected / failed.
         */
        async rejectPayment(orderId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (client && !String(orderId).startsWith('loc_ord_')) {
                try {
                    await client
                        .from('orders')
                        .update({ 
                            payment_status: 'failed',
                            status: 'cancelled',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', orderId);
                } catch (e) {
                    console.warn('[Amiele:Admin] Supabase rejectPayment error:', e);
                }
            }

            if (window.AmieleDB) {
                try {
                    const localOrders = window.AmieleDB.getOrders();
                    const target = localOrders.find(o => o.id === orderId);
                    if (target) {
                        target.payment_status = 'failed';
                        target.status = 'cancelled';
                        localStorage.setItem('amiele_local_orders', JSON.stringify(localOrders));
                    }
                } catch (e) {
                    console.warn('[Amiele:Admin] Local rejectPayment error:', e);
                }
            }
            return { success: true };
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
        },

        /**
         * Fetch all affiliate withdrawals for admin queue review.
         */
        async getWithdrawals() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data: withdrawals, error } = await client
                .from('affiliate_withdrawals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Amiele:Admin] Error fetching withdrawals:', error);
                return [];
            }

            // Fetch profiles to map names
            const userIds = withdrawals.map(w => w.affiliate_id);
            const { data: profiles, error: profileError } = await client
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            const profileMap = {};
            if (!profileError && profiles) {
                profiles.forEach(p => { profileMap[p.id] = p.full_name; });
            }

            return withdrawals.map(w => ({
                id: 'wth_' + w.id.slice(0, 8),
                rawId: w.id,
                affiliateId: profileMap[w.affiliate_id] || w.affiliate_id,
                affiliateUuid: w.affiliate_id,
                amount: parseFloat(w.amount),
                method: w.method,
                phone: w.phone,
                status: w.status,
                createdAt: w.created_at
            }));
        },

        /**
         * Approve, reject, or mark paid a withdrawal request in Supabase.
         */
        async updateWithdrawalStatus(rawId, status, adminId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('affiliate_withdrawals')
                .update({
                    status: status,
                    processed_by: adminId,
                    processed_at: new Date().toISOString()
                })
                .eq('id', rawId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Create a new affiliate campaign challenge.
         */
        async createCampaign(title, description, targetSales, reward, endsAt, adminId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('affiliate_campaigns')
                .insert({
                    title,
                    description,
                    target_sales: targetSales,
                    reward,
                    ends_at: endsAt,
                    status: 'active',
                    created_by: adminId
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        /**
         * Broadcast a new announcement.
         */
        async createAnnouncement(title, content, type, urgency, adminId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('affiliate_announcements')
                .insert({
                    title,
                    content,
                    type,
                    urgency,
                    created_by: adminId
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    };

    window.AdminService = AdminService;
})();
