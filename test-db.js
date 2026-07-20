const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhiamd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

// Admin credentials from profiles table: eyuelt354@gmail.com
const ADMIN_EMAIL = 'eyuelt354@gmail.com';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    // Step 1: Check if we can query without auth
    console.log('=== Test 1: Query applications WITHOUT auth (anon) ===');
    const { data: anonApps, error: anonErr } = await client
        .from('affiliate_applications')
        .select('*');
    console.log('Anon result:', anonErr ? `ERROR: ${anonErr.message}` : `${anonApps.length} rows`);

    // Step 2: Check current auth session
    console.log('\n=== Test 2: Check current auth session ===');
    const { data: { user } } = await client.auth.getUser();
    console.log('Current user:', user ? `${user.email} (id: ${user.id})` : 'NOT AUTHENTICATED');

    // Step 3: If not authenticated, try signing in as admin
    if (!user) {
        console.log('\n=== Test 3: Sign in as admin ===');
        console.log('NOTE: Cannot sign in without password. Testing with manual session check...');
    }

    // Step 4: Try the profiles query (which works on admin page)
    console.log('\n=== Test 4: Query profiles WITHOUT auth ===');
    const { data: profiles, error: profErr } = await client
        .from('profiles')
        .select('id, full_name, role');
    console.log('Profiles result:', profErr ? `ERROR: ${profErr.message}` : `${profiles.length} rows`);
    if (profiles && profiles.length > 0) {
        profiles.forEach(p => console.log(`  - ${p.full_name} (${p.role}) id:${p.id}`));
    }

    // Step 5: Try the old join query
    console.log('\n=== Test 5: Query applications WITH join (the failing query) ===');
    const { data: joinApps, error: joinErr } = await client
        .from('affiliate_applications')
        .select(`*, profile:profiles!user_id(full_name, email)`)
        .order('created_at', { ascending: false });
    console.log('Join result:', joinErr ? `ERROR: ${joinErr.message} (code: ${joinErr.code}, details: ${joinErr.details})` : `${joinApps.length} rows`);

    // Step 6: Try simple query without join
    console.log('\n=== Test 6: Query applications WITHOUT join (new approach) ===');
    const { data: simpleApps, error: simpleErr } = await client
        .from('affiliate_applications')
        .select('*')
        .order('created_at', { ascending: false });
    console.log('Simple result:', simpleErr ? `ERROR: ${simpleErr.message}` : `${simpleApps.length} rows`);
    if (simpleApps) {
        simpleApps.forEach(a => console.log(`  - user_id:${a.user_id} status:${a.status}`));
    }
}

run().catch(e => console.error('Fatal:', e));
