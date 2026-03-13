-- FIX STORAGE BUCKETS (Logos & Coaches) V2
-- This script creates the storage buckets needed for uploading images.
-- Updated to skip enabling RLS on storage.objects

-- 1. Create 'logos' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'coaches' bucket if not exists (used by Add Coach form)
INSERT INTO storage.buckets (id, name, public)
VALUES ('coaches', 'coaches', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Policies for 'logos'
-- We use DO blocks to avoid errors if policies already exist

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
    CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING ( bucket_id = 'logos' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Upload Logos" ON storage.objects;
    CREATE POLICY "Authenticated Upload Logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'logos' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Update Logos" ON storage.objects;
    CREATE POLICY "Authenticated Update Logos" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'logos' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Delete Logos" ON storage.objects;
    CREATE POLICY "Authenticated Delete Logos" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'logos' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Create Policies for 'coaches'

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access Coaches" ON storage.objects;
    CREATE POLICY "Public Access Coaches" ON storage.objects FOR SELECT USING ( bucket_id = 'coaches' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Upload Coaches" ON storage.objects;
    CREATE POLICY "Authenticated Upload Coaches" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'coaches' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Update Coaches" ON storage.objects;
    CREATE POLICY "Authenticated Update Coaches" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'coaches' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated Delete Coaches" ON storage.objects;
    CREATE POLICY "Authenticated Delete Coaches" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'coaches' );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Reload Config (Optional but good practice)
NOTIFY pgrst, 'reload config';
