import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = (env.match(/VITE_SUPABASE_SERVICE_ROLE=(.*)/)?.[1] || env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]).trim();

// Fix 1: Allow anon users to READ gym_settings so the login page can load custom themes
// Fix 2: Allow authenticated users to INSERT gym_settings if no row exists
const sql = `
-- Allow unauthenticated (login page) users to read the gym settings
DROP POLICY IF EXISTS "Public Read gym_settings" ON public.gym_settings;
CREATE POLICY "Public Read gym_settings" ON public.gym_settings FOR SELECT USING (true);

-- Allow authenticated users to INSERT a new settings row (if table is empty)
DROP POLICY IF EXISTS "Auth Insert gym_settings" ON public.gym_settings;
CREATE POLICY "Auth Insert gym_settings" ON public.gym_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to UPDATE existing settings rows
DROP POLICY IF EXISTS "Auth Update gym_settings" ON public.gym_settings;
CREATE POLICY "Auth Update gym_settings" ON public.gym_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure the gym_settings table has a base row if it's empty
INSERT INTO public.gym_settings (academy_name)
SELECT 'Academy System'
WHERE NOT EXISTS (SELECT 1 FROM public.gym_settings)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

console.log('🚀 Applying RLS fix...');
console.log('URL:', url);

const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ sql_string: sql })
});

const text = await res.text();
console.log('Status:', res.status);
console.log('Response:', text);
