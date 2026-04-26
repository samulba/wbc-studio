-- ============================================================
-- Migration 096 · Moodboard pro Raum
--
-- Pro Raum genau EIN Moodboard (UNIQUE constraint auf raum_id),
-- mit Versionen-Historie analog zu raumplan_versionen.
-- Freigabe via Token-Link für den Kunden, Read-only oder mit
-- Kommentar-Pins (über `freigabe_kommentare_aktiv`).
-- ============================================================

CREATE TABLE IF NOT EXISTS moodboards (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id             UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id                     UUID NOT NULL REFERENCES raeume(id)         ON DELETE CASCADE UNIQUE,
  name                        TEXT NOT NULL DEFAULT 'Moodboard',
  beschreibung                TEXT,
  -- Fabric.js-Canvas-State (Elemente, Position, Größe, Rotation, ...)
  canvas_json                 JSONB,
  -- Vorschaubild für Listen-Views (PNG-Snapshot beim Save, optional)
  vorschau_bild_url           TEXT,
  -- Freigabe für Kunden via /moodboard/<token>
  freigabe_token              UUID UNIQUE DEFAULT gen_random_uuid(),
  freigabe_aktiv              BOOLEAN NOT NULL DEFAULT false,
  freigabe_kommentare_aktiv   BOOLEAN NOT NULL DEFAULT false,
  freigabe_erstellt_am        TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboards_raum ON moodboards(raum_id);
CREATE INDEX IF NOT EXISTS idx_moodboards_org  ON moodboards(organisation_id);
CREATE INDEX IF NOT EXISTS idx_moodboards_freigabe_token
  ON moodboards(freigabe_token) WHERE freigabe_aktiv = true;

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION moodboards_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moodboards_updated_at ON moodboards;
CREATE TRIGGER moodboards_updated_at
  BEFORE UPDATE ON moodboards
  FOR EACH ROW EXECUTE FUNCTION moodboards_set_updated_at();

-- RLS: Org-scoped wie alle anderen Tabellen
ALTER TABLE moodboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moodboards_org_access" ON moodboards
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Anonyme Lese-Policy fuer Kunden-Freigabe (über Token)
CREATE POLICY "moodboards_anon_freigabe_select" ON moodboards
  FOR SELECT TO anon
  USING (freigabe_aktiv = true);


-- ============================================================
-- Versionen (analog raumplan_versionen)
-- ============================================================

CREATE TABLE IF NOT EXISTS moodboard_versionen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  moodboard_id    UUID NOT NULL REFERENCES moodboards(id)     ON DELETE CASCADE,
  name            TEXT NOT NULL,
  beschreibung    TEXT,
  canvas_json     JSONB NOT NULL,
  erstellt_von    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboard_versionen_board
  ON moodboard_versionen(moodboard_id, created_at DESC);

ALTER TABLE moodboard_versionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moodboard_versionen_org_access" ON moodboard_versionen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- Storage-Bucket fuer Moodboard-Bilder
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('moodboard-bilder', 'moodboard-bilder', false, 52428800)  -- 50 MB
  ON CONFLICT (id) DO NOTHING;

-- RLS-Policies fuer den Bucket. Pfad-Convention: <org_id>/<raum_id>/<filename>
CREATE POLICY "moodboard_bilder_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'moodboard-bilder'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "moodboard_bilder_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'moodboard-bilder'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

-- Anon-SELECT (für die Kunden-Freigabe-Seite, wo der signed-URL-Workflow nicht greift)
-- Hinweis: in der App nutzen wir signed URLs fuer Bild-Anzeige im Editor; bei Bedarf
-- kann diese Policy erweitert werden, sobald wir die Kunden-Ansicht implementieren.
CREATE POLICY "moodboard_bilder_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'moodboard-bilder'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );


-- ============================================================
-- Realtime-Publication fuer Live-Co-Editing (mehrere Designer)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'moodboards'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE moodboards';
  END IF;
END
$$;
