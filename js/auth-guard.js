/**
 * Amiele Begena - Centralized Auth & Route Persistence Guard
 * Handles non-racey session restoration, role verification, and full URL persistence.
 */
(function () {
    "use strict";

    const AuthGuard = {
        /**
         * Ensures Supabase session has resolved before making auth decisions.
         */
        async ensureSessionResolved() {
            const client = window.AmieleSupabase ? window.AmieleSupabase.getClient() : null;
            if (!client) return null;

            try {
                const { data: { session } } = await client.auth.getSession();
                if (session && session.user) {
                    return session.user;
                }
            } catch (e) {
                console.warn("[Amiele:AuthGuard] getSession error:", e);
            }
            return null;
        },

        /**
         * Gets current user profile cleanly via AuthService or AmieleDB.
         */
        async getCurrentUser(forceRefresh = false) {
            await this.ensureSessionResolved();
            if (window.AuthService && typeof window.AuthService.getCurrentUser === 'function') {
                return await window.AuthService.getCurrentUser(forceRefresh);
            }
            if (window.getCurrentUser && typeof window.getCurrentUser === 'function') {
                return await window.getCurrentUser(forceRefresh);
            }
            return null;
        },

        /**
         * Returns full relative URL including pathname, search query, and hash.
         */
        getFullCurrentUrl() {
            return window.location.pathname + window.location.search + window.location.hash;
        },

        /**
         * Redirects unauthenticated user to login while preserving full destination.
         */
        redirectToLogin(targetUrl) {
            const fullUrl = targetUrl || this.getFullCurrentUrl();
            const loginUrl = `login.html?redirect=${encodeURIComponent(fullUrl)}`;
            console.log("[Amiele:AuthGuard] Redirecting to login with return destination:", fullUrl);
            window.location.href = loginUrl;
        },

        /**
         * Authorizes current page access based on user role.
         */
        async protectPage(options = {}) {
            const { allowedRoles = [] } = options;

            const user = await this.getCurrentUser();

            if (!user) {
                this.redirectToLogin();
                return null;
            }

            // If specific roles are required, verify user role
            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                console.warn(`[Amiele:AuthGuard] Unauthorized role '${user.role}' for allowed roles:`, allowedRoles);
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (user.role === 'affiliate') {
                    window.location.href = 'affiliate-dashboard.html';
                } else {
                    window.location.href = 'account.html';
                }
                return null;
            }

            return user;
        },

        /**
         * Tab state helper: reads tab from URL query (?tab=X, ?section=X, ?page=X) or location.hash (#X).
         */
        getInitialTab(defaultTab, paramNames = ['tab', 'section', 'page']) {
            try {
                const searchParams = new URLSearchParams(window.location.search);
                for (const param of paramNames) {
                    const val = searchParams.get(param);
                    if (val && val.trim() !== '') return val.trim().toLowerCase();
                }
                if (window.location.hash) {
                    const hashVal = window.location.hash.replace('#', '').trim();
                    if (hashVal !== '') return hashVal.toLowerCase();
                }
            } catch (e) {
                console.warn("[Amiele:AuthGuard] Failed to parse URL tab:", e);
            }
            return defaultTab;
        },

        /**
         * Updates browser URL with tab state without reloading page, supporting Back/Forward.
         */
        syncTabToUrl(tabName, paramName = 'tab') {
            if (!tabName) return;
            try {
                const url = new URL(window.location.href);
                const currentVal = url.searchParams.get(paramName);
                if (currentVal !== tabName) {
                    url.searchParams.set(paramName, tabName);
                    window.history.replaceState({ tab: tabName }, '', url.pathname + url.search + url.hash);
                }
            } catch (e) {
                console.warn("[Amiele:AuthGuard] Failed to sync URL tab state:", e);
            }
        }
    };

    window.AuthGuard = AuthGuard;
})();
