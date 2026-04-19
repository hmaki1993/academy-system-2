const supabaseUrl = process.env.SUPABASE_URL || 'https://htsaqcmhkbcgqlrfxoqt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2FxY21oa2JjZ3FscmZ4b3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgwOTgyNSwiZXhwIjoyMDUyMzg1ODI1fQ.X2x-K_qgO597VwR28y_4lXo5I-N69_YkXkXN1_3r7_E';

async function testFetch() {
    console.log('Fetching top 5 recent FCM tokens...');
    const res = await fetch(`${supabaseUrl}/rest/v1/user_fcm_tokens?select=*&order=updated_at.desc&limit=5`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!res.ok) {
        console.error('Failed to fetch:', await res.text());
        return;
    }

    const tokens = await res.json();
    console.log(JSON.stringify(tokens, null, 2));

    if (tokens.length > 0) {
        // Find if any is Android Native
        const nativeToken = tokens.find(t => t.device_info && t.device_info.includes('Native APK'));
        if (nativeToken) {
           console.log('\nFOUND NATIVE ANDROID TOKEN:', nativeToken.fcm_token.substring(0, 20) + '...');
        } else {
           console.log('\nWARNING: NO recent NATIVE ANDROID tokens found! User is running Web/PWA or registration failed.');
        }
    }
}

testFetch();
