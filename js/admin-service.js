/**
 * Amiele Begena — Admin Service Layer
 * Coordinates back-office administration tasks: user roles, affiliate applications, referred sales, and payouts.
 */

(function () {
    'use strict';

    const AdminService = {
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
                    } else {
                        console.log('[Amiele:Admin] Querying applications as user:', user.email, user.id);
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
                        console.log('[Amiele:Admin] Raw applications from Supabase:', rawApps.length);
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
            console.log('[Amiele:Admin] Total merged applications:', result.length, 'pending:', result.filter(a => a.status === 'pending').length);
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
            const client = window.AmieleSupabase.getClient();
            if (!client) return [];

            const { data: orders, error } = await client
                .from('orders')
                .select(`
                    id,
                    order_number,
                    customer_name,
                    customer_email,
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

            if (error) throw error;

            // Fetch affiliate codes and names to display
            const { data: affiliates, error: affErr } = await client
                .from('affiliates')
                .select('user_id, referral_code');

            const codeMap = {};
            if (!affErr && affiliates) {
                affiliates.forEach(a => { codeMap[a.user_id] = a.referral_code; });
            }

            const exchangeRate = 120;
            return orders.map(o => {
                const itemPriceUSD = o.product ? parseFloat(o.product.price) : 0;
                const orderAmountETB = itemPriceUSD * o.quantity * exchangeRate;
                
                return {
                    id: o.id,
                    orderNumber: o.order_number || ('AM-XXXX-' + o.id.slice(0, 4).toUpperCase()),
                    customerName: o.customer_name || 'Guest Customer',
                    customerEmail: o.customer_email || 'N/A',
                    country: o.country || 'N/A',
                    referralCode: o.referral_code || 'Direct / None',
                    affiliateId: o.affiliate_id,
                    affiliateCode: codeMap[o.affiliate_id] || 'None',
                    productName: o.product ? `${o.quantity}x ${o.product.name}` : 'Instrument',
                    orderAmount: orderAmountETB,
                    paymentStatus: o.payment_status,
                    orderStatus: o.status,
                    createdAt: o.created_at
                };
            });
        },

        /**
         * Call secure PostgreSQL RPC to approve order payment.
         */
        async approvePayment(orderId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .rpc('approve_order_payment', { target_order_id: orderId });

            if (error) throw error;
            return data;
        },

        /**
         * Mark order payment as rejected / failed.
         */
        async rejectPayment(orderId) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client
                .from('orders')
                .update({ 
                    payment_status: 'failed',
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;
            return data;
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
