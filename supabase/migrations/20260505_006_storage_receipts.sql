-- ==========================================
-- STORAGE: GCASH RECEIPTS BUCKET
-- Private bucket with signed URL access
-- ==========================================

-- 1. Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies
DROP POLICY IF EXISTS "Customers can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access receipts" ON storage.objects;

-- Customers can upload to their own folder: receipts/uid/*
CREATE POLICY "Customers can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Customers can read their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin/Super Admin can read all receipts
CREATE POLICY "Admin full access receipts"
ON storage.objects FOR ALL
USING (
  bucket_id = 'receipts'
  AND (SELECT COALESCE(role, 'UNKNOWN') FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
);
