-- ============================================================
-- Migration 061 · User-Avatar pro Team-Mitglied
-- ============================================================
-- Jeder Nutzer soll in den Einstellungen > Profil ein eigenes Profilbild
-- hochladen können. Storage: neuer Bucket `team-avatare` (public-read).
-- Spalte: team_mitglieder.avatar_url (TEXT).

-- 1) Avatar-URL-Spalte auf team_mitglieder
ALTER TABLE team_mitglieder
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2) Storage-Bucket `team-avatare`
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatare', 'team-avatare', true,
  52428800, -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public             = true;

-- 3) Storage-Policies
-- Öffentlich lesen (Avatare werden in UI eingebettet)
CREATE POLICY "team-avatare public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'team-avatare');

-- Auth-Nutzer dürfen schreiben / aktualisieren / löschen
-- (weitere Ownership-Prüfung passiert in der Server-Action)
CREATE POLICY "team-avatare auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-avatare');

CREATE POLICY "team-avatare auth update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-avatare');

CREATE POLICY "team-avatare auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-avatare');
