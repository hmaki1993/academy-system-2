import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'g:/my work/MyRestoredProjects/healy-system/app/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPtSubscriptions() {
    console.log('Fetching students with user_id...');
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('*')
        .not('user_id', 'is', null);

    if (sErr || !students) {
        console.error('Error fetching students:', sErr);
        return;
    }

    console.log(`Found ${students.length} linked students. Updating PT subscriptions...`);

    for (const student of students) {
        if (!student.user_id) continue;

        let queryStr = `student_id.eq.${student.id}`;
        if (student.student_id) {
            queryStr += `,student_id.eq.${student.student_id}`;
            // Also try matching by name as fallback since some records might use name
            queryStr += `,student_name.ilike.%${student.full_name}%`;
        } else {
            queryStr += `,student_name.ilike.%${student.full_name}%`;
        }

        const { data, error } = await supabase
            .from('pt_subscriptions')
            .update({ user_id: student.user_id })
            .or(queryStr)
            .select();

        if (error) {
            console.error(`Error updating PT subs for student ${student.full_name}:`, error);
        } else if (data && data.length > 0) {
            console.log(`Updated ${data.length} PT subscriptions for user_id ${student.user_id} (${student.full_name})`);
        }
    }
    console.log('Done!');
}

fixPtSubscriptions();
