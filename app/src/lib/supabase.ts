import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL LOADED:", supabaseUrl);
console.log("SUPABASE KEY LOADED (length):", supabaseAnonKey ? supabaseAnonKey.length : "UNDEFINED");

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables! Check your .env file in the app directory.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
