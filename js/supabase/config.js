/**
 * ============================================================
 * Amiele Begena — Supabase Configuration
 * ============================================================
 *
 * PURPOSE:
 *   Centralized configuration file for Supabase credentials.
 *   All other Supabase modules import their credentials from
 *   this single file so values are never hardcoded elsewhere.
 *
 * SETUP:
 *   1. Go to https://supabase.com/dashboard
 *   2. Select your project → Settings → API
 *   3. Copy the "Project URL" and "anon (public) key"
 *   4. Replace the placeholder values below
 *
 * SECURITY NOTE:
 *   The anon key is SAFE to expose in frontend code.
 *   It is designed for use with Row Level Security (RLS).
 *   NEVER place the "service_role" key in frontend code.
 *
 * ============================================================
 */

const SUPABASE_CONFIG = {
    /**
     * Your Supabase project URL.
     * Example: 'https://abcdefghijklmnop.supabase.co'
     */
    url: 'YOUR_SUPABASE_PROJECT_URL',

    /**
     * Your Supabase publishable (anon) key.
     * This key is safe to expose in the browser.
     * Example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
     */
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
};

/**
 * Freeze the config object to prevent accidental mutation
 * anywhere in the codebase.
 */
Object.freeze(SUPABASE_CONFIG);

/**
 * Expose globally so other scripts loaded via <script> tags
 * can access the config without a module bundler.
 */
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
