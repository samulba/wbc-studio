-- ============================================================
-- Migration 080 · Chat: Datei- und Medien-Anhänge
--
-- Erweitert client_nachrichten um Anhang-Spalten. Ermöglicht das
-- Versenden von Fotos, Dateien und Sprachmemos im Kunden-Portal-Chat.
-- Text und Anhang können optional beide gesetzt sein — leere nachricht
-- ist erlaubt wenn ein Anhang vorhanden ist.
-- ============================================================

ALTER TABLE client_nachrichten
  ALTER COLUMN nachricht DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS typ TEXT NOT NULL DEFAULT 'text'
    CHECK (typ IN ('text', 'bild', 'datei', 'audio')),
  ADD COLUMN IF NOT EXISTS anhang_pfad    TEXT,
  ADD COLUMN IF NOT EXISTS anhang_typ     TEXT,         -- mime-type
  ADD COLUMN IF NOT EXISTS anhang_name    TEXT,
  ADD COLUMN IF NOT EXISTS anhang_groesse INTEGER,
  ADD COLUMN IF NOT EXISTS anhang_dauer   NUMERIC(10,2); -- Audio in Sekunden

-- Validierung: Entweder nachricht ist non-empty ODER ein Anhang existiert
ALTER TABLE client_nachrichten
  DROP CONSTRAINT IF EXISTS client_nachrichten_inhalt_check,
  ADD CONSTRAINT client_nachrichten_inhalt_check CHECK (
    (nachricht IS NOT NULL AND length(trim(nachricht)) > 0)
    OR anhang_pfad IS NOT NULL
  );

-- Storage-Bucket: privat, max 50 MB pro Datei
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('chat-attachments', 'chat-attachments', false, 52428800)
  ON CONFLICT (id) DO NOTHING;

-- Storage-RLS — Pfad-Konvention: `<organisation_id>/<projekt_id>/<uuid>-<filename>`
-- RLS am Pfad-Prefix, damit nur eigene Org lesen/schreiben kann.
-- Portal-User (nicht-authenticated Supabase-User) haben keinen direkten
-- Upload — sie gehen über die Portal-Server-Action mit Admin-Client.

CREATE POLICY "chat_att_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "chat_att_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "chat_att_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

COMMENT ON COLUMN client_nachrichten.typ IS
  'Nachrichten-Typ: text / bild / datei / audio. Bei text ist anhang_* NULL.';
COMMENT ON COLUMN client_nachrichten.anhang_pfad IS
  'Storage-Pfad im Bucket chat-attachments. Format: orgId/projektId/uuid-name.ext';
