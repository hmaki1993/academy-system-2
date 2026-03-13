-- NEW ACADEMY DEMO SETUP SCRIPT
-- Run this in the SQL Editor of your NEW Supabase project

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Enum Types
create type user_role as enum ('admin', 'head_coach', 'coach', 'reception', 'cleaner');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type payment_method as enum ('cash', 'knet', 'credit');
create type payment_type as enum ('subscription', 'uniform', 'competition', 'other');

-- 3. Create Profiles Table (Links to Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role default 'coach',
  avatar_url text,
  hourly_rate decimal(10,2) default 0,
  pt_percentage decimal(5,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Create Students Table
create table students (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  date_of_birth date,
  phone text,
  father_phone text,
  mother_phone text,
  address text,
  notes text,
  status text default 'active', -- active, inactive, frozen
  photo_url text,
  coach_id uuid references profiles(id),
  training_days text[], -- Array of days e.g. ['Mon', 'Wed']
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Create Subscriptions Table
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  plan_name text not null,
  start_date date not null,
  end_date date not null,
  price decimal(10,2) not null,
  is_paid boolean default true,
  payment_method payment_method default 'cash',
  created_at timestamptz default now()
);

-- 6. Create Attendance Tables
create table attendance (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id) on delete cascade,
  date date default current_date,
  status attendance_status default 'present',
  check_in_time timestamptz default now(),
  check_out_time timestamptz,
  created_at timestamptz default now()
);

create table coach_attendance (
  id uuid default uuid_generate_v4() primary key,
  coach_id uuid references profiles(id) on delete cascade,
  date date default current_date,
  check_in_time timestamptz default now(),
  check_out_time timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- 7. Create Finance Tables
create table payments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references students(id),
  amount decimal(10,2) not null,
  type payment_type default 'subscription',
  method payment_method default 'cash',
  date timestamptz default now(),
  description text,
  created_at timestamptz default now()
);

create table expenses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  amount decimal(10,2) not null,
  category text, -- rent, utilities, salaries, maintenance
  date date default current_date,
  notes text,
  created_at timestamptz default now()
);

-- 8. Create Groups Table
create table groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  coach_id uuid references profiles(id),
  days text[],
  start_time time,
  end_time time,
  created_at timestamptz default now()
);

-- 9. Create Settings Tables
create table gym_settings (
  id uuid default uuid_generate_v4() primary key,
  gym_name text default 'New Academy',
  address text,
  phone text,
  logo_url text,
  primary_color text default '#ef4444',
  secondary_color text default '#1f2937',
  updated_at timestamptz default now()
);

-- Insert Default Settings
insert into gym_settings (gym_name) values ('New Academy Demo');

-- 10. Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table students enable row level security;
alter table subscriptions enable row level security;
alter table attendance enable row level security;
alter table coach_attendance enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table groups enable row level security;
alter table gym_settings enable row level security;

-- 11. Create Policies (Simplified for Demo: Admin sees all)
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Allow authenticated users to view/edit students (simplified)
create policy "Authenticated users can view students" on students for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert students" on students for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update students" on students for update using (auth.role() = 'authenticated');

-- Repeat for other tables (simplified for demo)
-- In production, you'd have stricter policies
create policy "Enable all for authenticated" on subscriptions for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on attendance for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on coach_attendance for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on payments for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on expenses for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on groups for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on gym_settings for all using (auth.role() = 'authenticated');

-- 12. Create Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'coach');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ALL DONE!
