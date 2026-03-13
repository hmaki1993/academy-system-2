-- Drop potentially conflicting policies first to avoid "already exists" errors
drop policy if exists "Enable insert for authenticated users" on public.students;
drop policy if exists "Enable update for authenticated users" on public.students;

drop policy if exists "Enable insert for authenticated users" on public.pt_subscriptions;
drop policy if exists "Enable update for authenticated users" on public.pt_subscriptions;

-- Re-create the INSERT permissions
create policy "Enable insert for authenticated users"
on public.students for insert
to authenticated
with check (true);

-- Re-create the UPDATE permissions
create policy "Enable update for authenticated users"
on public.students for update
to authenticated
using (true);

-- Allow authenticated users to insert/update subscriptions
create policy "Enable insert for authenticated users"
on public.pt_subscriptions for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users"
on public.pt_subscriptions for update
to authenticated
using (true);
