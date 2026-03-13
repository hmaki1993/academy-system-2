-- Allow authenticated users to INSERT new students
create policy "Enable insert for authenticated users"
on public.students for insert
to authenticated
with check (true);

-- Allow authenticated users to UPDATE existing students
create policy "Enable update for authenticated users"
on public.students for update
to authenticated
using (true);

-- Also ensure they can insert into subscriptions (pt_subscriptions, etc) if needed
create policy "Enable insert for authenticated users"
on public.pt_subscriptions for insert
to authenticated
with check (true);

create policy "Enable update for authenticated users"
on public.pt_subscriptions for update
to authenticated
using (true);
