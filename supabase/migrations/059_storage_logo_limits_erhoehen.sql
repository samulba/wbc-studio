-- ============================================================
-- Migration 059 · Storage-Limits für Logo-Buckets anheben
-- ============================================================
-- Migration 016 hatte file_size_limit auf 2 MB und nur jpeg/png/webp/gif erlaubt.
-- Die Anwendung wurde auf 10 MB + SVG erweitert, aber der Bucket blockte weiter
-- → jeder größere/SVG-Upload schlug mit "Upload fehlgeschlagen" fehl.

UPDATE storage.buckets
SET
  file_size_limit    = 10485760,  -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id IN ('kunden-logos', 'partner-logos');
