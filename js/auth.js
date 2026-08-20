(function () {
    "use strict";

    let cachedUser = null;

    function formatUserProfile(profile) {
        if (!profile) return null;
        return {
            id: profile.id,
            name: profile.full_name || "User",
            email: profile.email,
            phone: profile.phone || "",
            country: profile.country || "Ethiopia",
            role: profile.role || "user",
            joinedAt: profile.created_at,
            bio: profile.bio || "",
            photoUrl: profile.avatar_url || ""
        };
    }

    const AuthService = {
        async signUp(name, email, password) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) throw new Error("Supabase client not initialized");
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name },
                    emailRedirectTo: "https://amielebegena.vercel.app/auth/confirm"
                }
            });
            if (error) throw error;
            return data.user;
        },

        async signIn(email, password) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) throw new Error("Supabase client not initialized");
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            cachedUser = null;
            return data.user;
        },

        async signOut() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            cachedUser = null;
            if (!client) return;
            const { error } = await client.auth.signOut();
            if (error) throw error;
        },

        async updateProfile(userId, profileData) {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) {
                if (window.AmieleDB && typeof window.AmieleDB.updateUserSettings === 'function') {
                    window.AmieleDB.updateUserSettings(userId, profileData);
                }
                return;
            }

            const updates = {};
            if (profileData.name !== undefined) updates.full_name = profileData.name;
            if (profileData.phone !== undefined) updates.phone = profileData.phone;
            if (profileData.photoUrl !== undefined) updates.avatar_url = profileData.photoUrl;
            if (profileData.bio !== undefined) updates.bio = profileData.bio;

            const { error } = await client
                .from("profiles")
                .update(updates)
                .eq("id", userId);

            if (error) {
                console.error("[Amiele:Auth] Error updating profile in Supabase:", error);
                throw error;
            }

            if (profileData.name) {
                try {
                    await client.auth.updateUser({
                        data: { full_name: profileData.name }
                    });
                } catch (e) {
                    console.warn("[Amiele:Auth] updateUser metadata sync warning:", e);
                }
            }

            cachedUser = null;
            return await this.getCurrentUser(true);
        },

        async getCurrentUser(forceRefresh = false) {
            if (cachedUser && !forceRefresh) return cachedUser;
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return null;

            try {
                // First ensure session is resolved from storage
                const { data: { session } } = await client.auth.getSession();
                let authUser = session ? session.user : null;

                if (!authUser) {
                    const { data: { user }, error: userErr } = await client.auth.getUser();
                    if (userErr || !user) {
                        cachedUser = null;
                        return null;
                    }
                    authUser = user;
                }

                // Fetch database profile
                const { data: profile, error: profileErr } = await client
                    .from("profiles")
                    .select("*")
                    .eq("id", authUser.id)
                    .single();

                if (profileErr || !profile) {
                    console.error("[Amiele:Auth] Error fetching profile:", profileErr);
                    // Fallback to basic session info if profile query fails
                    cachedUser = {
                        id: authUser.id,
                        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || "User",
                        email: authUser.email,
                        phone: "",
                        country: "Ethiopia",
                        role: "user",
                        joinedAt: authUser.created_at,
                        bio: "",
                        photoUrl: ""
                    };
                    return cachedUser;
                }

                cachedUser = formatUserProfile(profile);
                return cachedUser;
            } catch (e) {
                console.error("[Amiele:Auth] Failed to resolve current user:", e);
                return cachedUser;
            }
        },

        async isAuthenticated() {
            return (await this.getCurrentUser()) !== null;
        },

        async requireAuth(redirectTo = "login.html") {
            const isAuth = await this.isAuthenticated();
            if (!isAuth) {
                const fullDestination = window.location.pathname + window.location.search + window.location.hash;
                window.location.href = `${redirectTo}?redirect=${encodeURIComponent(fullDestination)}`;
            }
        },

        async requireGuest(redirectTo = "account.html") {
            const isAuth = await this.isAuthenticated();
            if (isAuth) {
                window.location.href = redirectTo;
            }
        },

        /**
         * Returns the raw Supabase auth user object (includes email_confirmed_at).
         * Always fetches from Supabase Auth, never from cache or localStorage.
         */
        async getAuthUser() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return null;
            try {
                const { data: { user }, error } = await client.auth.getUser();
                if (error || !user) return null;
                return user;
            } catch (e) {
                console.error("[Amiele:Auth] getAuthUser error:", e);
                return null;
            }
        },

        /**
         * Checks if the current user's email is verified.
         * Uses live Supabase auth state — never localStorage.
         * @returns {Promise<boolean>}
         */
        async isEmailVerified() {
            const authUser = await this.getAuthUser();
            if (!authUser) return false;
            return Boolean(authUser.email_confirmed_at);
        },

        /**
         * Resends the verification email with a 60-second cooldown.
         * Uses sessionStorage for cooldown tracking (not for verification state).
         * @param {string} email
         * @returns {Promise<{success: boolean, error?: string, cooldownRemaining?: number}>}
         */
        async resendVerificationEmail(email) {
            const COOLDOWN_KEY = 'amiele_verify_resend_ts';
            const COOLDOWN_SECONDS = 60;

            // Check cooldown
            const lastSent = parseInt(sessionStorage.getItem(COOLDOWN_KEY) || '0', 10);
            const elapsed = Math.floor((Date.now() - lastSent) / 1000);
            if (lastSent && elapsed < COOLDOWN_SECONDS) {
                const remaining = COOLDOWN_SECONDS - elapsed;
                return { success: false, error: `Please wait ${remaining} seconds before requesting again.`, cooldownRemaining: remaining };
            }

            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return { success: false, error: 'Authentication service unavailable.' };

            try {
                const { error } = await client.auth.resend({
                    type: 'signup',
                    email: email
                });
                if (error) {
                    console.error('[Amiele:Auth] Resend verification error:', error);
                    return { success: false, error: error.message };
                }
                sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
                return { success: true };
            } catch (e) {
                console.error('[Amiele:Auth] Resend verification exception:', e);
                return { success: false, error: e.message || 'An unexpected error occurred.' };
            }
        }
    };

    window.AuthService = AuthService;
    window.getCurrentUser = async function (forceRefresh) {
        return await AuthService.getCurrentUser(forceRefresh);
    };
    window.isAuthenticated = async function () {
        return await AuthService.isAuthenticated();
    };
    window.requireAuth = async function (redirectTo) {
        return await AuthService.requireAuth(redirectTo);
    };
    window.requireGuest = async function (redirectTo) {
        return await AuthService.requireGuest(redirectTo);
    };
    window.isEmailVerified = async function () {
        return await AuthService.isEmailVerified();
    };
    window.resendVerificationEmail = async function (email) {
        return await AuthService.resendVerificationEmail(email);
    };
})();