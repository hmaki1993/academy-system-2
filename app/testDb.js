import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pbghmxikirnecsgrxffb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiZ2hteGlraXJuZWNzZ3J4ZmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTA5MzksImV4cCI6MjA4NjA2NjkzOX0.HD2fdK3gXCjPK7GWK3Fn7jD6T6KDT6VdzTceRbPBN2U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const payload = {
        student_id: null,
        student_name: 'Test Guest',
        coach_id: 'a8e9e6df-0f46-4a41-862d-0de84050d276', // Just an example, might fail if coach_id is invalid, but let's see why it's failing
        sessions_total: 10,
        sessions_remaining: 10,
        start_date: '2026-03-05',
        expiry_date: '2027-03-05',
        total_price: 1000,
        price_per_session: 100,
        coach_share: 50,
        student_phone: '1234567890',
        student_email: 'test@example.com',
        status: 'active'
    };

    const { data, error } = await supabase.from('pt_subscriptions').insert(payload);
    console.log('Result:', data, error);
}

testInsert();
