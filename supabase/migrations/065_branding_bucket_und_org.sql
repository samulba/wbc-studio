-- ============================================================
-- Migration 065 · Branding-Storage-Bucket + Org-Zuweisung
-- ============================================================
-- 1) Existierende branding-Zeilen ohne organisation_id der ersten Org zuordnen
--    (seit Multi-Tenancy in Migration 036 filtert RLS alles ohne Org).
-- 2) Storage-Bucket `branding` anlegen (50 MB, typische Bildformate).

-- 1) Org-Zuweisung für Legacy-Branding-Datensätze
UPDATE branding
SET    organisation_id = (SELECT id FROM organisationen ORDER BY created_at LIMIT 1)
WHERE  organisation_id IS NULL
  AND  EXISTS (SELECT 1 FROM organisationen);

-- 2) Bucket anlegen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding', 'branding', true,
  52428800, -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/x-icon']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public             = true;

-- 3) Storage-Policies (öffentlich lesen, Auth für write — Ownership wird
--    server-seitig in der Action geprüft)
CREATE POLICY "branding public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'branding');

CREATE POLICY "branding auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding');

CREATE POLICY "branding auth update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding');

CREATE POLICY "branding auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding');
