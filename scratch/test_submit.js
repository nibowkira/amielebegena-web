const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhiamd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    }
});

async function run() {
    console.log('=== Starting Test Submit Application ===');
    
    const email = `tester_${Date.now()}@example.com`;
    const password = 'Password123!';
    const fullName = 'Test Candidate';

    // 1. Sign up
    console.log(`1. Signing up user: ${email}...`);
    const { data: signUpData, error: signUpErr } = await client.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });

    if (signUpErr) {
        console.error('Sign up failed:', signUpErr.message, signUpErr);
        return;
    }

    const user = signUpData.user;
    console.log(`   Sign up successful! User ID: ${user.id}, Role: ${user.role}, Confirmed: ${user.email_confirmed_at}`);

    // If email confirmation is required, let's see if we need to sign in
    console.log('2. Signing in to get session...');
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
        email,
        password
    });

    if (signInErr) {
        console.warn('   Sign in failed (email confirmation may be required):', signInErr.message);
        // If email confirmation is required, we can't test further without confirming the email.
        // But wait! We can look at the sign up response. If user.role is 'authenticated', we might already have a session.
    } else {
        console.log('   Sign in successful! Session user id:', signInData.user.id);
    }

    // Attempt to select profile
    const activeUser = signInData.user || user;
    
    // Set active session in client manually if signIn succeeded or not
    const session = signInData.session;
    if (session) {
        console.log('   Using authenticated session...');
    } else {
        console.log('   Testing insert with unconfirmed session...');
    }

    // 3. Insert Application
    console.log('\n3. Inserting application into affiliate_applications table...');
    const { data: appData, error: appErr } = await client
        .from('affiliate_applications')
        .insert({
            user_id: activeUser.id,
            motivation: 'I want to help preserve ancient cultural music instruments.',
            social_link: 'instagram.com/test_candidate, youtube.com/test_candidate',
            status: 'pending'
        })
        .select()
        .single();

    if (appErr) {
        console.error('   INSERT FAILED:');
        console.error('   Message:', appErr.message);
        console.error('   Code:', appErr.code);
        console.error('   Details:', appErr.details);
        console.error('   Hint:', appErr.hint);
    } else {
        console.log('   INSERT SUCCEEDED!', appData);
    }

    // 4. Query profile
    console.log('\n4. Querying own profile to verify role and RLS...');
    const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .single();

    if (profileErr) {
        console.error('   Profile read failed:', profileErr.message);
    } else {
        console.log('   Profile read succeeded:', profile);
    }
}

run().catch(err => console.error('Fatal test error:', err));
