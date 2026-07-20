const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hbjgwpogebzgosqldshy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhiamd3cG9nZWJ6Z29zcWxkc2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTI2MTcsImV4cCI6MjA5OTE2ODYxN30.fkY4NLobeMYYloMN3OvAgW-ABzp--NkANXAtBbW5nbA';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PASSWORDS = [
    'admin',
    'admin123',
    'admin1234',
    'password',
    'Password123!',
    'amiele',
    'amiele123',
    'eyuelt354',
    'eyuelt354@gmail.com'
];

async function run() {
    console.log('=== Attempting to guess admin password ===');
    const email = 'admin@amiele.com';

    for (const password of PASSWORDS) {
        console.log(`Trying: ${password}...`);
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (!error) {
            console.log(`\n🎉 SUCCESS! Admin password is: ${password}`);
            console.log('User details:', data.user);
            return;
        } else {
            console.log(`   Failed: ${error.message}`);
        }
    }

    // Try standard admin email if it's different
    const admin2 = 'eyuelt354@gmail.com';
    console.log(`\n=== Trying alternative admin: ${admin2} ===`);
    for (const password of PASSWORDS) {
        console.log(`Trying ${admin2} with: ${password}...`);
        const { data, error } = await client.auth.signInWithPassword({
            email: admin2,
            password
        });

        if (!error) {
            console.log(`\n🎉 SUCCESS! Admin password for ${admin2} is: ${password}`);
            console.log('User details:', data.user);
            return;
        } else {
            console.log(`   Failed: ${error.message}`);
        }
    }

    console.log('\nCould not guess admin password.');
}

run().catch(err => console.error(err));
