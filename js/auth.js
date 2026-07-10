/**
 * Amiele Begena — Authentication Service Layer
 * Interfaces with Supabase Auth and coordinates user session logic.
 */

(function () {
    'use strict';

    // Cached profile session to avoid excessive DB hits
    let _cachedProfile = null;

    /**
     * Map Supabase profile DB schema to expected frontend schema.
     */
    function mapProfile(profile) {
        if (!profile) return null;
        return {
            id: profile.id,
            name: profile.full_name || 'User',
            email: profile.email,
            role: profile.role || 'user',
            joinedAt: profile.created_at,
            bio: profile.bio || '',
            photoUrl: profile.avatar_url || ''
        };
    }

    const AuthService = {
        /**
         * Sign up a new user.
         */
        async signUp(name, email, password) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

            if (error) throw error;
            return data.user;
        },

        /**
         * Sign in user.
         */
        async signIn(email, password) {
            const client = window.AmieleSupabase.getClient();
            if (!client) throw new Error('Supabase client not initialized');

            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Clear cached profile to force reload on next request
            _cachedProfile = null;
            return data.user;
        },

        /**
         * Log out user.
         */
        async signOut() {
            const client = window.AmieleSupabase.getClient();
            if (!client) return;

            const { error } = await client.auth.signOut();
            _cachedProfile = null;
            if (error) throw error;
        },

        /**
         * Get currently authenticated user with profile details.
         */
        async getCurrentUser(forceRefresh = false) {
            if (_cachedProfile && !forceRefresh) {
                return _cachedProfile;
            }

            const client = window.AmieleSupabase.getClient();
            if (!client) return null;

            const { data: { user }, error: userError } = await client.auth.getUser();
            if (userError || !user) {
                _cachedProfile = null;
                return null;
            }

            // Fetch profile data
            const { data: profile, error: profileError } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                console.error('[Amiele:Auth] Error fetching profile:', profileError);
                return null;
            }

            _cachedProfile = mapProfile(profile);
            return _cachedProfile;
        },

        /**
         * Check if the user is authenticated.
         */
        async isAuthenticated() {
            const user = await this.getCurrentUser();
            return user !== null;
        },

        /**
         * Route guard: require authenticated user.
         */
        async requireAuth(redirectUrl = 'login.html') {
            const isLoggedIn = await this.isAuthenticated();
            if (!isLoggedIn) {
                window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
            }
        },

        /**
         * Route guard: require guest status.
         */
        async requireGuest(redirectUrl = 'account.html') {
            const isLoggedIn = await this.isAuthenticated();
            if (isLoggedIn) {
                window.location.href = redirectUrl;
            }
        }
    };

    // Expose helpers globally to maintain compatibility with script.js and guards
    window.AuthService = AuthService;

    // Overwrite the legacy window functions to transparently route to AuthService
    window.getCurrentUser = async function () {
        return await AuthService.getCurrentUser();
    };

    window.isAuthenticated = async function () {
        return await AuthService.isAuthenticated();
    };

    window.requireAuth = async function () {
        return await AuthService.requireAuth();
    };

    window.requireGuest = async function () {
        return await AuthService.requireGuest();
    };
})();
