-- SEED DEMO DATA SCRIPT
-- Run this AFTER running setup_demo_db.sql

-- 1. Insert Sample Coaches
insert into profiles (id, email, full_name, role, hourly_rate, pt_percentage)
values 
  (uuid_generate_v4(), 'headcoach@demo.com', 'Coach Ahmed (Head)', 'head_coach', 15.00, 50),
  (uuid_generate_v4(), 'coach1@demo.com', 'Coach Sarah', 'coach', 10.00, 40),
  (uuid_generate_v4(), 'coach2@demo.com', 'Coach Mike', 'coach', 10.00, 40);

-- 2. Insert Sample Students (10 students)
insert into students (full_name, date_of_birth, status, training_days, notes)
values
  ('Youssef Ahmed', '2015-05-15', 'active', ARRAY['Mon', 'Wed', 'Sat'], 'Promising talent'),
  ('Layla Hassan', '2016-03-20', 'active', ARRAY['Sun', 'Tue', 'Thu'], 'Needs flexibility work'),
  ('Omar Khaled', '2014-11-10', 'active', ARRAY['Mon', 'Wed'], 'Brother of Ali'),
  ('Noura Ali', '2017-01-05', 'active', ARRAY['Sat'], 'Beginner'),
  ('Ziad Mostafa', '2015-08-30', 'expired', ARRAY['Sun', 'Tue'], 'Subscription ended last week'),
  ('Karma Ebrahim', '2016-12-12', 'active', ARRAY['Mon', 'Thu'], 'Very energetic'),
  ('Malak Samy', '2018-02-28', 'active', ARRAY['Wed', 'Sat'], 'Tiny tots group'),
  ('Hamza Tarek', '2014-06-15', 'active', ARRAY['Sun', 'Tue', 'Thu'], 'Advanced level'),
  ('Farida Sherif', '2015-09-09', 'active', ARRAY['Mon', 'Wed'], 'Preparing for competition'),
  ('Adam Mahmoud', '2016-07-22', 'inactive', ARRAY['Sat'], 'Traveling for summer');

-- 3. Insert Subscriptions (Active & Expired)
with std as (select id, full_name from students)
insert into subscriptions (student_id, plan_name, start_date, end_date, price, is_paid)
select id, 'Gold Plan (3 Months)', current_date - interval '1 month', current_date + interval '2 months', 150.00, true
from std where full_name like 'Youssef%';

with std as (select id, full_name from students)
insert into subscriptions (student_id, plan_name, start_date, end_date, price, is_paid)
select id, 'Silver Plan (1 Month)', current_date - interval '5 days', current_date + interval '25 days', 60.00, true
from std where full_name like 'Layla%';

with std as (select id, full_name from students)
insert into subscriptions (student_id, plan_name, start_date, end_date, price, is_paid)
select id, 'Expired Plan', current_date - interval '2 months', current_date - interval '1 day', 60.00, true
from std where full_name like 'Ziad%';

-- 4. Insert Attendance Records (Last 7 days)
with std as (select id from students limit 5)
insert into attendance (student_id, date, status, check_in_time)
select id, current_date, 'present', now() - interval '2 hours'
from std;

with std as (select id from students limit 3)
insert into attendance (student_id, date, status, check_in_time)
select id, current_date - interval '1 day', 'present', (current_date - interval '1 day') + time '16:00'
from std;

-- 5. Insert Finance Records (Revenue)
insert into payments (amount, type, method, date, description)
values
  (150.00, 'subscription', 'knet', now() - interval '2 days', 'Youssef Ahmed - Gold Plan'),
  (60.00, 'subscription', 'cash', now() - interval '5 days', 'Layla Hassan - Silver Plan'),
  (25.00, 'uniform', 'cash', now() - interval '1 day', 'Gym uniform purchase'),
  (60.00, 'subscription', 'credit', now() - interval '1 month', 'Ziad Mostafa - Monthly'),
  (100.00, 'subscription', 'knet', now() - interval '3 days', 'Omar Khaled - Private Training');

-- 6. Insert Expenses
insert into expenses (title, amount, category, date)
values
  ('Cleaning Supplies', 15.00, 'maintenance', current_date - interval '2 days'),
  ('Electricity Bill', 45.00, 'utilities', current_date - interval '10 days'),
  ('Coach Salaries (Advance)', 200.00, 'salaries', current_date - interval '15 days');

-- 7. Create some Groups
with coach as (select id from profiles where role = 'head_coach' limit 1)
insert into groups (name, coach_id, days, start_time, end_time)
select 'Elite Team', id, ARRAY['Sun', 'Tue', 'Thu'], '16:00', '19:00'
from coach;

with coach as (select id from profiles where role = 'coach' limit 1)
insert into groups (name, coach_id, days, start_time, end_time)
select 'Beginners A', id, ARRAY['Mon', 'Wed'], '17:00', '18:00'
from coach;

---- DONE SEEDING
