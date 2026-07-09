/**
 * ============================================================
 * Amiele Begena — Supabase Connection Test
 * ============================================================
 *
 * PURPOSE:
 *   A simple diagnostic script that verifies the frontend can
 *   communicate with the Supabase API. Designed for development
 *   and initial setup verification.
 *
 * HOW TO USE:
 *   1. Open any page that loads the Supabase scripts
 *   2. Open the browser console (F12 → Console)
 *   3. Run: AmieleSupabase.testConnection()
 *   4. Check the console output for success or failure
 *
 * WHAT IT TESTS:
 *   - Supabase SDK is loaded (CDN script present)
 *   - Config credentials are set (not placeholders)
 *   - Client can be created successfully
 *   - API is reachable (via auth.getSession())
 *
 * NOTE:
 *   This file can be removed or disabled in production.
 *   It has no effect on the rest of the application.
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
     * Run a full connection diagnostic against Supabase.
     *
     * This function performs a series of checks and logs the
     * results to the browser console with clear pass/fail indicators.
     *
     * @returns {Promise<boolean>} — True if all checks pass.
     *
     * @example
     *   // In browser console:
     *   AmieleSupabase.testConnection();
     *
     *   // Or in code:
     *   const ok = await AmieleSupabase.testConnection();
     *   if (ok) { console.log('Ready to go!'); }
     */
    window.AmieleSupabase.testConnection = async function () {
        const log = function (label, pass, detail) {
            const icon = pass ? '✅' : '❌';
            console.log(`${icon} [Amiele:Test] ${label}`, detail || '');
        };

        console.log('');
        console.log('══════════════════════════════════════════');
        console.log('  Amiele Begena — Supabase Connection Test');
        console.log('══════════════════════════════════════════');
        console.log('');

        let allPassed = true;

        // ── Test 1: SDK Loaded ──
        const sdkLoaded = typeof supabase !== 'undefined' && typeof supabase.createClient === 'function';
        log('Supabase SDK loaded', sdkLoaded, sdkLoaded ? '' : '→ Add the CDN <script> tag');
        if (!sdkLoaded) allPassed = false;

        // ── Test 2: Config Present ──
        const configPresent = !!window.SUPABASE_CONFIG;
        log('Config object found', configPresent, configPresent ? '' : '→ Load config.js before client.js');
        if (!configPresent) allPassed = false;

        // ── Test 3: Credentials Configured ──
        const isConfigured = window.AmieleSupabase.helpers
            ? window.AmieleSupabase.helpers.isConfigured()
            : false;
        log('Credentials configured', isConfigured,
            isConfigured ? '' : '→ Replace placeholders in js/supabase/config.js');
        if (!isConfigured) allPassed = false;

        // ── Test 4: Client Initialized ──
        const client = window.AmieleSupabase.getClient
            ? window.AmieleSupabase.getClient()
            : null;
        const clientOk = client !== null;
        log('Client initialized', clientOk,
            clientOk ? '' : '→ Check config values and SDK loading order');
        if (!clientOk) allPassed = false;

        // ── Test 5: API Reachable ──
        if (clientOk) {
            try {
                const { data, error } = await client.auth.getSession();
                if (error) {
                    log('API reachable', false, `→ ${error.message}`);
                    allPassed = false;
                } else {
                    log('API reachable', true, '(auth.getSession() responded)');
                    log('Active session', !!data?.session,
                        data?.session ? 'User is logged in' : 'No active session (expected for fresh setup)');
                }
            } catch (err) {
                log('API reachable', false, `→ Network error: ${err.message}`);
                allPassed = false;
            }
        } else {
            log('API reachable', false, '→ Skipped (client not initialized)');
        }

        // ── Summary ──
        console.log('');
        if (allPassed) {
            console.log('🎉 All checks passed! Supabase is connected and ready.');
        } else {
            console.log('⚠️  Some checks failed. Review the items marked with ❌ above.');
        }
        console.log('══════════════════════════════════════════');
        console.log('');

        return allPassed;
    };

    /**
     * Auto-run a quick status check on page load.
     * This only logs a brief status line — not the full diagnostic.
     */
    document.addEventListener('DOMContentLoaded', function () {
        if (window.AmieleSupabase.helpers && window.AmieleSupabase.helpers.isConfigured()) {
            console.log('[Amiele:Supabase] ✅ Supabase is configured. Run AmieleSupabase.testConnection() for full diagnostic.');
        } else {
            console.log('[Amiele:Supabase] ⚠️ Supabase credentials not configured. Run AmieleSupabase.testConnection() for details.');
        }
    });
})();
