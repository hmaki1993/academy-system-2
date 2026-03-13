import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'g:/my work/MyRestoredProjects/healy-system/app/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPtOnly() {
    console.log('Fetching profiles...');
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, email');

    if (pErr) {
        console.error('Error fetching profiles:', pErr);
        return;
    }

    for (const p of profiles) {
        const { data, error } = await supabase
            .from('pt_subscriptions')
            .update({ user_id: p.id })
            .or(`student_email.ilike.${p.email},student_name.ilike.%${p.full_name}%`)
            .select();

        if (error) {
            console.error(`Error updating PT subs for ${p.full_name}:`, error);
        } else if (data && data.length > 0) {
            console.log(`Updated ${data.length} PT subscriptions for user_id ${p.id} (${p.full_name})`);
        }
    }
    console.log('PT User Linking Done!');
}

fixPtOnly();
