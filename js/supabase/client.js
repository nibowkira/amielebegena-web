/**
 * ============================================================
 * Amiele Begena — Supabase Client (Singleton)
 * ============================================================
 *
 * PURPOSE:
 *   Creates and exports a single, reusable Supabase client
 *   instance. The client is initialized ONCE and shared across
 *   the entire application to avoid redundant connections.
 *
 * DEPENDENCIES:
 *   - config.js (must be loaded BEFORE this file)
 *   - Supabase JS SDK loaded via CDN <script> tag
 *
 * USAGE (from any script):
 *   const client = window.AmieleSupabase.getClient();
 *   // Then use: client.from('table').select('*') etc.
 *
 * LOAD ORDER (in HTML):
 *   1. Supabase CDN script
 *   2. js/supabase/config.js
 *   3. js/supabase/helpers.js
 *   4. js/supabase/client.js    ← this file
 *   5. Other supabase modules (auth.js, database.js, etc.)
 *
 * ============================================================
 */

(function () {
    'use strict';

    /**
     * Internal reference to the Supabase client.
     * Initialized lazily on first call to getClient().
     * @type {object|null}
     */
    let _client = null;

    /**
     * Tracks whether initialization has been attempted
     * to prevent duplicate init calls.
     * @type {boolean}
     */
    let _initialized = false;

    /**
     * Initialize the Supabase client using credentials from config.js.
     *
     * This function:
     *   - Validates that the Supabase SDK is loaded
     *   - Validates that config credentials are set
     *   - Creates the client instance exactly once
     *
     * @returns {object|null} The Supabase client, or null on failure.
     */
    function _initClient() {
        // Guard: prevent double initialization
        if (_initialized) {
            return _client;
        }
        _initialized = true;

        // Check that the Supabase SDK is available (loaded via CDN)
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            console.error(
                '[Amiele:Supabase] SDK not found. Ensure the Supabase CDN script is loaded before client.js.'
            );
            return null;
        }

        // Check that config is available
        if (!window.SUPABASE_CONFIG) {
            console.error(
                '[Amiele:Supabase] Config not found. Ensure config.js is loaded before client.js.'
            );
            return null;
        }

        const { url, anonKey } = window.SUPABASE_CONFIG;

        // Validate credentials are not still placeholders
        if (
            !url ||
            !anonKey ||
            url === 'YOUR_SUPABASE_PROJECT_URL' ||
            anonKey === 'YOUR_SUPABASE_ANON_KEY'
        ) {
            console.warn(
                '[Amiele:Supabase] Credentials are not configured. ' +
                'Open js/supabase/config.js and replace the placeholder values ' +
                'with your Supabase Project URL and Anon Key.'
            );
            return null;
        }

        // Create the singleton client
        try {
            _client = supabase.createClient(url, anonKey);
            console.log('[Amiele:Supabase] Client initialized successfully.');
        } catch (error) {
            console.error('[Amiele:Supabase] Failed to create client:', error.message);
            _client = null;
        }

        return _client;
    }

    /**
     * Global namespace for Amiele Supabase utilities.
     * Exposed on `window` so all scripts can access it without
     * a module bundler.
     */
    window.AmieleSupabase = window.AmieleSupabase || {};

    /**
     * Get the Supabase client instance.
     * Initializes the client on first call (lazy initialization).
     *
     * @returns {object|null} The Supabase client instance.
     *
     * @example
     *   const client = window.AmieleSupabase.getClient();
     *   const { data, error } = await client.from('products').select('*');
     */
    window.AmieleSupabase.getClient = function () {
        if (!_client) {
            _initClient();
        }
        return _client;
    };

    /**
     * Check if the client has been successfully initialized.
     *
     * @returns {boolean} True if the client is ready.
     */
    window.AmieleSupabase.isReady = function () {
        return _client !== null;
    };
})();
