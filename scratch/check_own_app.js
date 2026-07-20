const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhiamd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    }
});

async function run() {
    console.log('=== Checking own application as tester user ===');
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

    const user = signInData.user;
    console.log('Logged in successfully. User ID:', user.id);

    const { data: apps, error: appsErr } = await client
        .from('affiliate_applications')
        .select('*');

    if (appsErr) {
        console.error('Query failed:', appsErr.message);
    } else {
        console.log('Applications returned:', apps);
    }
}

run().catch(err => console.error(err));
