-- Allow valid users (admin, coach, reception) to view the students list
create policy "Allow authenticated read access"
on public.students for select
to authenticated
using (true);

-- Also allow reading coaches for the dropdowns
create policy "Allow authenticated read access"
on public.coaches for select
to authenticated
using (true);
