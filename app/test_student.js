import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_APP_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_APP_SUPABASE_KEY';

// I need to read the env variables from the actual .env file.
import * as dotenv from 'dotenv';
dotenv.config({ path: 'g:/my work/MyRestoredProjects/healy-system/app/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // Let's get "Hamd" student
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, user_id, training_groups(*), subscription_plans(*), coaches(*)')
        .ilike('full_name', '%Hamd%');

    console.log("Students:", JSON.stringify(students, null, 2));
    console.log("Error:", error);
}

test();
