
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akbpfyjszuuwyraoalyf.supabase.co';
const supabaseKey = 'sb_publishable_VjSit-7tvd1Y44zyf8oj_Q_aR2uMSoK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log('Checking profile for MORES...');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .ilike('full_name', '%MORES%');

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No profile found for MORES.');
        return;
    }

    console.log('Found profiles:', data);

    for (const profile of data) {
        if (profile.role !== 'student') {
            console.log(`Fixing role for ${profile.full_name} from ${profile.role} to student...`);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'student' })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`Failed to update ${profile.full_name}:`, updateError);
            } else {
                console.log(`Successfully updated ${profile.full_name}.`);
            }
        }
    }
}

fix();
