-- Create student_attendance table
create table if not exists public.student_attendance (
    id uuid default gen_random_uuid() primary key,
    student_id bigint references public.students(id) not null,
    date date not null default current_date,
    check_in_time timestamp with time zone not null default now(),
    check_out_time timestamp with time zone,
    status text default 'present',
    created_at timestamp with time zone default now()
);

-- Add RLS policies
alter table public.student_attendance enable row level security;

create policy "Enable read access for authenticated users"
    on public.student_attendance for select
    to authenticated
    using (true);

create policy "Enable insert for authenticated users"
    on public.student_attendance for insert
    to authenticated
    with check (true);

create policy "Enable update for authenticated users"
    on public.student_attendance for update
    to authenticated
    using (true);
