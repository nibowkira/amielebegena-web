/**
 * ============================================================
 * Amiele Begena — Supabase Auth Guard and Global Helpers
 * ============================================================
 *
 * PURPOSE:
 *   Provides route protection and exposes standard helper functions
 *   globally (`getCurrentUser`, `isAuthenticated`, `requireAuth`, `requireGuest`).
 *
 * FUNCTIONS:
 *   - getCurrentUser() : Get current user data (fallback to legacy session)
 *   - isAuthenticated() : Boolean check if user is logged in
 *   - requireAuth() : Redirects guest users to login.html
 *   - requireGuest() : Redirects logged-in users away from login.html
 *
 * DEPENDENCIES:
 *   - client.js, auth.js
 *
 * ============================================================
 */

(function () {
    'use strict';

    window.AmieleSupabase = window.AmieleSupabase || {};

    /**
     * Get current user (either from Supabase session or fallback to legacy localStorage).
     *
     * @param {boolean} forceRefresh - Force request to Supabase servers.
     * @returns {Promise<object|null>}
     */
    window.getCurrentUser = async function (forceRefresh = false) {
        if (window.AmieleSupabase.auth && typeof window.AmieleSupabase.auth.getCurrentUser === 'function') {
            return await window.AmieleSupabase.auth.getCurrentUser(forceRefresh);
        }
        try {
            return JSON.parse(localStorage.getItem('amiele_current_session')) || null;
        } catch (e) {
            return null;
        }
    };

    /**
     * Check if user is authenticated.
     *
     * @returns {Promise<boolean>}
     */
    window.isAuthenticated = async function () {
        if (window.AmieleSupabase.auth && typeof window.AmieleSupabase.auth.isAuthenticated === 'function') {
            return await window.AmieleSupabase.auth.isAuthenticated();
        }
        const user = await window.getCurrentUser();
        return user !== null;
    };

    /**
     * Guard: Ensure user is logged in, else redirect to login.html.
     *
     * @param {string|null} redirectUrl - URL to redirect to after successful login.
     */
    window.requireAuth = async function (redirectUrl = null) {
        const authed = await window.isAuthenticated();
        if (!authed) {
            // Get current page to redirect back after login
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            const loginDest = redirectUrl || `login.html?redirect=${currentPath}`;
            window.location.href = loginDest;
        }
    };

    /**
     * Guard: Ensure user is NOT logged in (e.g. on login page), else redirect to account.html.
     *
     * @param {string} redirectUrl - URL to redirect logged-in users to.
     */
    window.requireGuest = async function (redirectUrl = 'account.html') {
        const authed = await window.isAuthenticated();
        if (authed) {
            window.location.href = redirectUrl;
        }
    };

    // Expose helpers inside AmieleSupabase namespace as well
    window.AmieleSupabase.getCurrentUser = window.getCurrentUser;
    window.AmieleSupabase.isAuthenticated = window.isAuthenticated;
    window.AmieleSupabase.requireAuth = window.requireAuth;
    window.AmieleSupabase.requireGuest = window.requireGuest;

    // Execute route guards based on current page
    async function checkCurrentRoute() {
        const path = window.location.pathname;

        // Protected pages
        if (
            path.endsWith('account.html') ||
            path.endsWith('admin.html') ||
            path.endsWith('affiliate-dashboard.html') ||
            path.endsWith('affiliate-apply.html')
        ) {
            await window.requireAuth();
        }

        // Guest only pages
        if (path.endsWith('login.html')) {
            await window.requireGuest();
        }
    }

    // Run the route guard check immediately and on DOMContentLoaded
    checkCurrentRoute();
    document.addEventListener('DOMContentLoaded', checkCurrentRoute);

})();
