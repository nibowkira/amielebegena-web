/**
 * ============================================================
 * Amiele Begena — Supabase Auth Module (Implementation)
 * ============================================================
 *
 * PURPOSE:
 *   Handles Supabase Authentication operations and coordinates
 *   session state with the legacy localStorage-based authentication.
 *
 * MIGRATION BRIDGE:
 *   To prevent breaking existing pages and logic (such as the cart checkout,
 *   referral tracking, and account pages), this module updates the old
 *   localStorage keys (`isLoggedIn`, `userName`, and `amiele_current_session`)
 *   whenever a user signs in, signs up, or signs out.
 *
 * DEPENDENCIES:
 *   - config.js, helpers.js, client.js (loaded before this file)
 *
 * ============================================================
 */

(function () {
    'use strict';

    window.AmieleSupabase = window.AmieleSupabase || {};

    /**
     * Map a Supabase user object to the legacy AmieleDB user structure.
     * This preserves compatibility with existing scripts.
     *
     * @param {object} user - The Supabase user object.
     * @returns {object} - Mapped user object.
     */
    function _mapToLegacyUser(user) {
        if (!user) return null;

        const email = user.email;
        const metadata = user.user_metadata || {};
        const name = metadata.name || email.split('@')[0];

        // Determine user role using a fallback sequence:
        // 1. User metadata role
        // 2. Seeded roles based on email
        // 3. Fallback to check legacy users in localStorage
        let role = metadata.role || 'user';

        if (email.toLowerCase() === 'admin@amiele.com') {
            role = 'admin';
        } else if (email.toLowerCase() === 'dawit@music.et') {
            role = 'affiliate';
        } else {
            // Check localStorage mock database if it exists
            try {
                const legacyUsers = JSON.parse(localStorage.getItem('amiele_users')) || [];
                const matched = legacyUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (matched && matched.role) {
                    role = matched.role;
                }
            } catch (e) {
                console.error('[Amiele:Auth] Error reading legacy role:', e);
            }
        }

        return {
            id: user.id,
            name: name,
            email: email,
            role: role,
            bio: metadata.bio || '',
            photoUrl: metadata.photoUrl || null,
            joinedAt: user.created_at
        };
    }

    /**
     * Synchronize the active session with legacy localStorage keys.
     *
     * @param {object|null} user - The Supabase user object, or null to clear.
     */
    function _syncLegacySession(user) {
        if (user) {
            const legacyUser = _mapToLegacyUser(user);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', legacyUser.name);
            localStorage.setItem('amiele_current_session', JSON.stringify(legacyUser));
            
            // Add user to local users database for compatibility if not already present
            try {
                const legacyUsers = JSON.parse(localStorage.getItem('amiele_users')) || [];
                if (!legacyUsers.find(u => u.email.toLowerCase() === legacyUser.email.toLowerCase())) {
                    legacyUsers.push({
                        id: legacyUser.id,
                        name: legacyUser.name,
                        email: legacyUser.email,
                        password: 'supabase_auth_managed',
                        role: legacyUser.role,
                        joinedAt: legacyUser.joinedAt
                    });
                    localStorage.setItem('amiele_users', JSON.stringify(legacyUsers));
                }
            } catch (e) {
                console.error('[Amiele:Auth] Error syncing legacy user list:', e);
            }
        } else {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userName');
            localStorage.removeItem('amiele_current_session');
        }
    }

    /**
     * Auth implementation object.
     */
    window.AmieleSupabase.auth = {

        /**
         * Sign up a new user.
         *
         * @param {string} email - Email address.
         * @param {string} password - Password.
         * @param {string} name - Full Name of the user.
         * @returns {Promise<{success: boolean, data: any, error: string|null}>}
         */
        signUp: async function (email, password, name) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { success: false, data: null, error: 'Supabase client not initialized.' };
            }

            try {
                const response = await client.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            name: name,
                            role: 'user' // default role
                        }
                    }
                });

                const formatted = window.AmieleSupabase.helpers.formatResponse(response);
                if (formatted.success) {
                    const user = formatted.data.user;
                    
                    // If session is returned immediately (auto-confirm is enabled in Supabase settings)
                    if (formatted.data.session) {
                        _syncLegacySession(user);
                    } else {
                        // Email verification is required.
                        // We store the name in localStorage temporarily to restore it when confirmed/logged in.
                        localStorage.setItem('amiele_signup_pending_name', name);
                    }
                    return { success: true, data: formatted.data, error: null };
                } else {
                    const msg = window.AmieleSupabase.helpers.handleError('auth.signUp', formatted.error);
                    return { success: false, data: null, error: msg };
                }
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError('auth.signUp', err);
                return { success: false, data: null, error: msg };
            }
        },

        /**
         * Sign in a user with email and password.
         *
         * @param {string} email - Email address.
         * @param {string} password - Password.
         * @returns {Promise<{success: boolean, data: any, error: string|null}>}
         */
        signIn: async function (email, password) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { success: false, data: null, error: 'Supabase client not initialized.' };
            }

            try {
                const response = await client.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                const formatted = window.AmieleSupabase.helpers.formatResponse(response);
                if (formatted.success) {
                    _syncLegacySession(formatted.data.user);
                    return { success: true, data: formatted.data, error: null };
                } else {
                    const msg = window.AmieleSupabase.helpers.handleError('auth.signIn', formatted.error);
                    return { success: false, data: null, error: msg };
                }
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError('auth.signIn', err);
                return { success: false, data: null, error: msg };
            }
        },

        /**
         * Sign out the active user.
         *
         * @returns {Promise<{success: boolean, error: string|null}>}
         */
        signOut: async function () {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                _syncLegacySession(null); // Force local clear anyway
                return { success: true, error: null };
            }

            try {
                const response = await client.auth.signOut();
                const formatted = window.AmieleSupabase.helpers.formatResponse(response);
                
                // Always clear legacy session flags regardless of server error
                _syncLegacySession(null);

                if (formatted.success) {
                    return { success: true, error: null };
                } else {
                    const msg = window.AmieleSupabase.helpers.handleError('auth.signOut', formatted.error);
                    return { success: false, error: msg };
                }
            } catch (err) {
                _syncLegacySession(null);
                const msg = window.AmieleSupabase.helpers.handleError('auth.signOut', err);
                return { success: false, error: msg };
            }
        },

        /**
         * Get the active user profile synchronously from localStorage or async from Supabase.
         *
         * @param {boolean} forceRefresh - If true, fetches fresh data from server.
         * @returns {Promise<object|null>} Mapped user object.
         */
        getCurrentUser: async function (forceRefresh = false) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                // Fallback to legacy localStorage session
                try {
                    return JSON.parse(localStorage.getItem('amiele_current_session')) || null;
                } catch (e) {
                    return null;
                }
            }

            try {
                if (forceRefresh) {
                    const { data: { user }, error } = await client.auth.getUser();
                    if (error) throw error;
                    _syncLegacySession(user);
                    return _mapToLegacyUser(user);
                } else {
                    // Quick check using the local SDK session cache
                    const { data: { session } } = await client.auth.getSession();
                    if (session?.user) {
                        _syncLegacySession(session.user);
                        return _mapToLegacyUser(session.user);
                    }
                    _syncLegacySession(null);
                    return null;
                }
            } catch (err) {
                console.warn('[Amiele:Auth] Failed to get user session:', err);
                return null;
            }
        },

        /**
         * Check if the user is currently authenticated.
         * Note: This is an async check because getSession() is async in Supabase JS SDK.
         *
         * @returns {Promise<boolean>}
         */
        isAuthenticated: async function () {
            const user = await window.AmieleSupabase.auth.getCurrentUser();
            return user !== null;
        },

        /**
         * Listen for authentication state changes and keep legacy local storage in sync.
         *
         * @param {function} callback - Callback function (event, session).
         * @returns {object} Subscription reference.
         */
        onAuthStateChange: function (callback) {
            const client = window.AmieleSupabase.getClient();
            if (!client) {
                return { data: { subscription: { unsubscribe: function () {} } } };
            }

            const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
                window.AmieleSupabase.helpers.log('Auth', `State change detected: ${event}`);
                
                if (session?.user) {
                    _syncLegacySession(session.user);
                } else {
                    _syncLegacySession(null);
                }

                if (typeof callback === 'function') {
                    callback(event, session);
                }
            });

            return subscription;
        },

        /**
         * Password reset stub.
         */
        resetPassword: async function (email) {
            const client = window.AmieleSupabase.getClient();
            if (!client) return { success: false, error: 'Client not ready' };
            try {
                const response = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/login.html'
                });
                return window.AmieleSupabase.helpers.formatResponse(response);
            } catch (err) {
                const msg = window.AmieleSupabase.helpers.handleError('auth.resetPassword', err);
                return { success: false, error: msg };
            }
        }
    };

    // Auto-restore session from Supabase on startup
    document.addEventListener('DOMContentLoaded', async () => {
        if (window.AmieleSupabase.isReady()) {
            await window.AmieleSupabase.auth.getCurrentUser();
        }
    });
})();
