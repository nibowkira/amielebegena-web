const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhicmd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function run() {
    console.log('=== Calling RPC get_user_role ===');
    const email = 'tester_1784542802059@example.com';
    const password = 'Password123!';

    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email,
        password
    });

    if (signInErr) {
        console.error('Sign in failed:', signInErr.message);
        return;
    }

    const { data: role, error: rpcErr } = await client.rpc('get_user_role');
    if (rpcErr) {
        console.error('RPC failed:', rpcErr.message, rpcErr);
    } else {
        console.log('RPC returned role:', role);
    }
}

run().catch(err => console.error(err));
