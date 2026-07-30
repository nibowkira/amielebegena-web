/**
 * Amiele Begena — Notifications Service Layer
 * Live Supabase database coordinator & Realtime WebSocket client for platform notifications.
 */

(function () {
    'use strict';

    let _realtimeChannel = null;

    const NotificationsService = {
        /**
         * Fetch current authenticated user's profile role from Supabase Auth / Local Cache.
         */
        async _getCurrentUser() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return { user: null, role: 'customer' };

            try {
                const { data: { session } } = await client.auth.getSession();
                if (!session || !session.user) {
                    return { user: null, role: 'customer' };
                }

                // Check profile role
                const { data: profile } = await client
                    .from('profiles')
                    .select('id, role')
                    .eq('id', session.user.id)
                    .single();

                const role = profile ? profile.role : 'customer';
                return { user: session.user, role };
            } catch (err) {
                console.warn('[Amiele:Notifications] User check exception:', err);
                return { user: null, role: 'customer' };
            }
        },

        /**
         * Fetch notifications list from public.notifications.
         * @param {Object} opts
         * @param {number} [opts.page=1]
         * @param {number} [opts.limit=20]
         * @param {string} [opts.filter='all'] - 'all'|'unread'|'orders'|'payments'|'shipping'|'affiliate'|'system'
         * @param {string} [opts.search='']
         * @returns {Promise<Object>} { success: true, notifications: [], totalCount, unreadCount, page, totalPages }
         */
        async getNotifications(opts = {}) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                return { success: false, error: 'Database connection unavailable.', notifications: [] };
            }

            const page = Math.max(1, parseInt(opts.page, 10) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 20));
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            const filter = (opts.filter || 'all').toLowerCase();
            const search = (opts.search || '').trim().toLowerCase();

            const { user, role } = await this._getCurrentUser();

            try {
                let query = client
                    .from('notifications')
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false });

                // Apply RLS-matching filters on client-query if needed
                if (role !== 'admin') {
                    if (user) {
                        query = query.or(`user_id.eq.${user.id},and(user_id.is.null,user_role.eq.${role})`);
                    } else {
                        query = query.eq('user_role', 'customer');
                    }
                }

                // Filter tabs
                if (filter === 'unread') {
                    query = query.eq('is_read', false);
                } else if (filter === 'orders') {
                    query = query.in('type', ['order_created', 'fulfillment_preparing', 'fulfillment_crafting', 'fulfillment_packed', 'fulfillment_shipped', 'fulfillment_delivered']);
                } else if (filter === 'payments') {
                    query = query.eq('type', 'payment_verified');
                } else if (filter === 'shipping') {
                    query = query.in('type', ['fulfillment_shipped', 'fulfillment_delivered', 'fulfillment_packed']);
                } else if (filter === 'affiliate') {
                    query = query.in('type', ['commission_pending', 'commission_earned', 'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected', 'affiliate_application', 'affiliate_approved']);
                } else if (filter === 'system') {
                    query = query.in('type', ['system_warning', 'low_stock']);
                }

                // Text search
                if (search) {
                    query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
                }

                // Pagination range
                query = query.range(from, to);

                const { data, count, error } = await query;

                if (error) {
                    console.error('[Amiele:Notifications] Fetch error:', error);
                    return { success: false, error: error.message, notifications: [] };
                }

                // Get unread count
                const unreadRes = await this.getUnreadCount();

                return {
                    success: true,
                    notifications: data || [],
                    totalCount: count || 0,
                    unreadCount: unreadRes.count || 0,
                    page,
                    totalPages: Math.ceil((count || 0) / limit)
                };
            } catch (err) {
                console.error('[Amiele:Notifications] Fetch exception:', err);
                return { success: false, error: err.message, notifications: [] };
            }
        },

        /**
         * Get unread notifications count.
         * @returns {Promise<Object>} { success: true, count: number }
         */
        async getUnreadCount() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return { success: false, count: 0 };

            const { user, role } = await this._getCurrentUser();

            try {
                let query = client
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_read', false);

                if (role !== 'admin') {
                    if (user) {
                        query = query.or(`user_id.eq.${user.id},and(user_id.is.null,user_role.eq.${role})`);
                    } else {
                        query = query.eq('user_role', 'customer');
                    }
                }

                const { count, error } = await query;
                if (error) {
                    console.error('[Amiele:Notifications] Unread count error:', error);
                    return { success: false, count: 0 };
                }
                return { success: true, count: count || 0 };
            } catch (err) {
                return { success: false, count: 0 };
            }
        },

        /**
         * Mark single notification as read.
         * @param {string} notificationId
         */
        async markAsRead(notificationId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !notificationId) return { success: false };

            try {
                const { data, error } = await client
                    .from('notifications')
                    .update({
                        is_read: true,
                        read_at: new Date().toISOString()
                    })
                    .eq('id', notificationId)
                    .select();

                if (error) {
                    console.error('[Amiele:Notifications] Mark as read error:', error);
                    return { success: false, error: error.message };
                }
                return { success: true, data };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        /**
         * Mark all unread notifications as read.
         */
        async markAllAsRead() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return { success: false };

            const { user, role } = await this._getCurrentUser();

            try {
                let query = client
                    .from('notifications')
                    .update({
                        is_read: true,
                        read_at: new Date().toISOString()
                    })
                    .eq('is_read', false);

                if (role !== 'admin') {
                    if (user) {
                        query = query.or(`user_id.eq.${user.id},and(user_id.is.null,user_role.eq.${role})`);
                    } else {
                        query = query.eq('user_role', 'customer');
                    }
                }

                const { error } = await query;
                if (error) {
                    console.error('[Amiele:Notifications] Mark all read error:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        /**
         * Delete notification by ID.
         * @param {string} notificationId
         */
        async deleteNotification(notificationId) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client || !notificationId) return { success: false };

            try {
                const { error } = await client
                    .from('notifications')
                    .delete()
                    .eq('id', notificationId);

                if (error) {
                    console.error('[Amiele:Notifications] Delete error:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }
        },

        /**
         * Subscribe to Supabase Realtime channel for live notification updates.
         * @param {Function} onChangeCallback - Called whenever INSERT/UPDATE/DELETE occurs on notifications
         * @returns {Function} Unsubscribe cleanup function
         */
        subscribeToRealtime(onChangeCallback) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                console.warn('[Amiele:Notifications] Realtime unavailable: Supabase client missing.');
                return () => {};
            }

            try {
                // Remove existing channel if present
                if (_realtimeChannel) {
                    client.removeChannel(_realtimeChannel);
                }

                _realtimeChannel = client.channel('public:notifications-realtime')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'notifications' },
                        (payload) => {
                            console.log('[Amiele:Realtime] Notification change received:', payload.eventType, payload);
                            if (typeof onChangeCallback === 'function') {
                                onChangeCallback(payload);
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log('[Amiele:Realtime] Notifications channel status:', status);
                    });

                return () => {
                    if (_realtimeChannel) {
                        client.removeChannel(_realtimeChannel);
                        _realtimeChannel = null;
                    }
                };
            } catch (err) {
                console.error('[Amiele:Realtime] Subscription error:', err);
                return () => {};
            }
        }
    };

    window.NotificationsService = NotificationsService;
})();
