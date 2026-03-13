-- Force ALL users to be admins (Run this to instantly fix your access)
UPDATE profiles 
SET role = 'admin';

-- Verify the change (this query works without the email column)
SELECT id, full_name, role FROM profiles;
