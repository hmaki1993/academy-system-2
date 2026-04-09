import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ CRITICAL: Missing Supabase Environment Variables!');
    console.info('To fix this "Black Screen": Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Project Settings -> Environment Variables.');
}

// Only create the client if we have a valid-ish URL to prevent hard crash
console.log('--- SUPABASE CONNECTIVITY CHECK ---');
console.log('URL Loaded:', supabaseUrl ? 'YES' : 'NO');
console.log('Anon Key Loaded:', supabaseAnonKey ? 'YES' : 'NO');
if (supabaseUrl) console.log('Project Ref:', supabaseUrl.split('//')[1]?.split('.')[0]);
console.log('---------------------------------');

export const supabase = (supabaseUrl && supabaseUrl.startsWith('http')) 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : createClient('https://placeholder.supabase.co', 'placeholder'); // Dummy to prevent evaluation crash
