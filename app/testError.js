import fs from 'fs';
const url = 'https://pbghmxikirnecsgrxffb.supabase.co/rest/v1/pt_subscriptions';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiZ2hteGlraXJuZWNzZ3J4ZmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTA5MzksImV4cCI6MjA4NjA2NjkzOX0.HD2fdK3gXCjPK7GWK3Fn7jD6T6KDT6VdzTceRbPBN2U';

async function test() {
    const payload = {
        student_id: null,
        student_name: 'Test Guest',
        coach_id: 'a8e9e6df-0f46-4a41-862d-0de84050d276',
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

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
    fs.writeFileSync('error_out.json', text, 'utf-8');
}

test();
