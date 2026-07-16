/**
 * Amiele Begena — Supabase Client Singleton
 * Configures and initializes the global Supabase client using CDN SDK exports.
 */

(function () {
    'use strict';

    const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhiamd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

    let _client = null;

    function initClient() {
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            console.error('[Amiele:Supabase] SDK not found. Ensure CDN script tag is loaded before client.js.');
            return null;
        }

        try {
            _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });
        } catch (error) {
            console.error('[Amiele:Supabase] Failed to create client:', error.message);
            _client = null;
        }
        return _client;
    }

    // Eagerly initialize so hash-fragment tokens are processed on any page
    initClient();

    // Export globally
    window.AmieleSupabase = {
        getClient() {
            if (!_client) {
                initClient();
            }
            return _client;
        },
        isReady() {
            return _client !== null;
        }
    };
})();
