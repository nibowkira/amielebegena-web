/**
 * ============================================================
 * Amiele Begena — Supabase Helper Utilities
 * ============================================================
 *
 * PURPOSE:
 *   Shared utility functions used across all Supabase modules.
 *   Provides standardized error handling, response formatting,
 *   development logging, and configuration validation.
 *
 * USAGE:
 *   These helpers are consumed internally by other modules
 *   (auth.js, database.js, profile.js) and can also be used
 *   directly in page scripts.
 *
 * DEPENDENCIES:
 *   - config.js (must be loaded before this file)
 *
 * ============================================================
 */

(function () {
    'use strict';

    window.AmieleSupabase = window.AmieleSupabase || {};

    /**
     * HELPERS MODULE
     * ==============
     */
    window.AmieleSupabase.helpers = {

        /**
         * Standardized error handler for Supabase operations.
         *
         * Logs the error with a consistent prefix and returns
         * a user-friendly message. In production, this could
         * be extended to report to an error tracking service.
         *
         * @param {string} context — Where the error occurred (e.g., 'auth.signIn').
         * @param {object|string} error — The Supabase error object or message.
         * @returns {string} — A user-friendly error message.
         *
         * @example
         *   const { data, error } = await client.from('users').select('*');
         *   if (error) {
         *       const msg = AmieleSupabase.helpers.handleError('database.fetchUsers', error);
         *       showToast(msg, 'error');
         *   }
         */
        handleError: function (context, error) {
            const errorMessage = typeof error === 'string' ? error : (error?.message || 'Unknown error');
            const errorCode = error?.code || 'UNKNOWN';

            console.error(`[Amiele:Supabase] Error in ${context}:`, {
                code: errorCode,
                message: errorMessage,
                details: error?.details || null,
                hint: error?.hint || null,
            });

            // Map common Supabase/Postgres error codes to user-friendly messages
            const userMessages = {
                '23505': 'This record already exists.',
                '42501': 'You do not have permission to perform this action.',
                '23503': 'This operation references data that does not exist.',
                'PGRST116': 'The requested record was not found.',
                'invalid_credentials': 'Invalid email or password.',
                'user_already_exists': 'An account with this email already exists.',
            };

            return userMessages[errorCode] || errorMessage;
        },

        /**
         * Normalize a Supabase response into a consistent format.
         *
         * Supabase returns { data, error } — this wrapper ensures
         * a predictable shape with a success boolean for easy checks.
         *
         * @param {object} response — The raw Supabase response { data, error }.
         * @returns {object} — { success, data, error }
         *
         * @example
         *   const raw = await client.from('products').select('*');
         *   const result = AmieleSupabase.helpers.formatResponse(raw);
         *   if (result.success) {
         *       console.log('Products:', result.data);
         *   }
         */
        formatResponse: function (response) {
            if (response.error) {
                return {
                    success: false,
                    data: null,
                    error: response.error,
                };
            }
            return {
                success: true,
                data: response.data,
                error: null,
            };
        },

        /**
         * Development-mode logger with a consistent prefix.
         *
         * Only logs when not in production. In a future build step,
         * this could be stripped from production bundles.
         *
         * @param {string} module — The module name (e.g., 'Auth', 'Database').
         * @param {string} message — The log message.
         * @param {...*} args — Additional data to log.
         *
         * @example
         *   AmieleSupabase.helpers.log('Auth', 'User signed in', user);
         */
        log: function (module, message, ...args) {
            // In production, you could check a flag to suppress logs:
            // if (window.AMIELE_ENV === 'production') return;
            console.log(`[Amiele:${module}]`, message, ...args);
        },

        /**
         * Check if Supabase credentials have been configured.
         *
         * Useful for showing setup instructions to developers
         * or gracefully degrading when Supabase is not yet set up.
         *
         * @returns {boolean} — True if credentials are set (not placeholders).
         *
         * @example
         *   if (!AmieleSupabase.helpers.isConfigured()) {
         *       console.warn('Supabase is not configured. Using localStorage fallback.');
         *   }
         */
        isConfigured: function () {
            if (!window.SUPABASE_CONFIG) return false;

            const { url, anonKey } = window.SUPABASE_CONFIG;
            return (
                url &&
                anonKey &&
                url !== 'YOUR_SUPABASE_PROJECT_URL' &&
                anonKey !== 'YOUR_SUPABASE_ANON_KEY'
            );
        },

        /**
         * Generate a UUID v4 string.
         *
         * Utility for creating IDs when needed client-side.
         * In most cases, Supabase generates IDs server-side,
         * but this is useful for optimistic UI updates.
         *
         * @returns {string} — A UUID v4 string.
         */
        generateId: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        },
    };
})();
