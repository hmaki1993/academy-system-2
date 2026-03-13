import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'g:/my work/MyRestoredProjects/healy-system/app/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_APP';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    // 1. Get auth user Hamd
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Cannot list users (might need service role key):', error.message);

        // Let's try matching via profiles table
        const { data: profiles } = await supabase.from('profiles').select('*').ilike('full_name', '%Hamd%');
        console.log("Found profiles for Hamd:", profiles);

        if (profiles && profiles.length > 0) {
            const hamdUser = profiles[0];
            const userId = hamdUser.id; // profile id is user_id

            // Link to student table
            const { data: students } = await supabase.from('students').select('*').ilike('full_name', '%Hamd%');
            console.log("Found student records for Hamd:", students);

            if (students && students.length > 0) {
                const studentId = students[0].id;
                console.log(`Linking student ${studentId} to user ${userId}`);

                const { error: updateError } = await supabase.from('students').update({ user_id: userId }).eq('id', studentId);
                console.log("Update result:", updateError ? updateError : 'Success');
            } else {
                console.log("No student record found for Hamd to link!");
            }
        }
        return;
    }
}

fix();
