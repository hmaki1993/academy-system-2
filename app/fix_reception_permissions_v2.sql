-- Drop potential conflicting policies first
drop policy if exists "Allow authenticated read access" on public.students;
drop policy if exists "Enable read access for all users" on public.students;
drop policy if exists "Enable read access for authenticated users" on public.students;

drop policy if exists "Allow authenticated read access" on public.coaches;
drop policy if exists "Enable read access for all users" on public.coaches;
drop policy if exists "Enable read access for authenticated users" on public.coaches;

-- Re-create the policies clearly
alter table public.students enable row level security;
alter table public.coaches enable row level security;

-- 1. Allow EVERYONE who is logged in to read students
create policy "Enable read access for authenticated users"
on public.students for select
to authenticated
using (true);

-- 2. Allow EVERYONE who is logged in to read coaches
create policy "Enable read access for authenticated users"
on public.coaches for select
to authenticated
using (true);

-- 3. Just in case: Grant usage on schema
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
