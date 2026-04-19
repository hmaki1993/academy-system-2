const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../../.env' }); // or whichever has the keys

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://akbpfyjszuuwyraoalyf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Using the keys provided in the env
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('user_fcm_tokens').select('*').order('updated_at', { ascending: false }).limit(3);
  console.log('TOKENS ERROR:', error);
  console.log('TOKENS DATA:', data);
}
run();
