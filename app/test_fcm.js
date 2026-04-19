import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akbpfyjszuuwyraoalyf.supabase.co';
const supabaseKey = 'sb_publishable_VjSit-7tvd1Y44zyf8oj_Q_aR2uMSoK'; // Using Anon Key is fine for this table if RLS allows, otherwise I'll need to bypass RLS or check the result.

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Querying FCM Tokens...');
    const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);
        
    console.log('Tokens error?', error);
    console.log('Top tokens:', tokens);
}
check();
