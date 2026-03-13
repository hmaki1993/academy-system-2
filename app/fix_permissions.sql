-- 1. Fix Table Permissions
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coaches ENABLE ROW LEVEL SECURITY;

-- Allow Authenticated Users to Edit/Delete (CRUD)
-- We drop first to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON coaches;

CREATE POLICY "Enable all access for authenticated users" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON coaches FOR ALL USING (auth.role() = 'authenticated');

-- 2. Fix Storage Permissions (Bucket: 'coaches')
-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('coaches', 'coaches', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow Uploads/Edits to 'coaches' bucket
-- Drop old policies if they exist to start fresh
DROP POLICY IF EXISTS "Give public access to coaches folder" ON storage.objects;
DROP POLICY IF EXISTS "Give authenticated access to coaches folder" ON storage.objects;
DROP POLICY IF EXISTS "Give authenticated update access to coaches folder" ON storage.objects;
DROP POLICY IF EXISTS "Give authenticated delete access to coaches folder" ON storage.objects;

CREATE POLICY "Give public access to coaches folder" ON storage.objects FOR SELECT TO public USING (bucket_id = 'coaches');
CREATE POLICY "Give authenticated access to coaches folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'coaches');
CREATE POLICY "Give authenticated update access to coaches folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'coaches');
CREATE POLICY "Give authenticated delete access to coaches folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'coaches');
