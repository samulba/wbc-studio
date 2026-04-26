-- ============================================================
-- Migration 097 · Moodboard Kommentar-Pins
--
-- Pins werden auf dem Canvas in World-Koordinaten platziert
-- (pos_x, pos_y). Pro Pin gibt es einen Thread mit beliebig
-- vielen Antworten (parent_id self-referencing).
--
-- Kunden duerfen via Anon-Policy lesen und schreiben, wenn das
-- zugehoerige Moodboard freigabe_aktiv=true UND
-- freigabe_kommentare_aktiv=true hat.
-- ============================================================

CREATE TABLE IF NOT EXISTS moodboard_kommentare (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  moodboard_id    UUID NOT NULL REFERENCES moodboards(id)     ON DELETE CASCADE,
  -- self-referencing: parent_id = NULL → Top-Level Pin; sonst Antwort
  parent_id       UUID REFERENCES moodboard_kommentare(id)    ON DELETE CASCADE,
  -- World-Koordinaten auf dem Canvas (nur fuer Top-Level Pins relevant)
  pos_x           DOUBLE PRECISION,
  pos_y           DOUBLE PRECISION,
  -- Optional: Verknuepfung zu einem Canvas-Objekt (Fabric.js id)
  bezogen_auf     TEXT,
  -- Wer hat geschrieben? Entweder ein Org-User ODER ein Kunden-Name+Email (anon)
  autor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_name      TEXT,
  autor_email     TEXT,
  ist_kunde       BOOLEAN NOT NULL DEFAULT false,
  inhalt          TEXT NOT NULL CHECK (length(inhalt) BETWEEN 1 AND 2000),
  -- Erledigt-Marker (nur Top-Level Pins)
  erledigt        BOOLEAN NOT NULL DEFAULT false,
  erledigt_am     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodboard_kommentare_board
  ON moodboard_kommentare(moodboard_id, created_at);
CREATE INDEX IF NOT EXISTS idx_moodboard_kommentare_parent
  ON moodboard_kommentare(parent_id) WHERE parent_id IS NOT NULL;

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION moodboard_kommentare_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moodboard_kommentare_updated_at ON moodboard_kommentare;
CREATE TRIGGER moodboard_kommentare_updated_at
  BEFORE UPDATE ON moodboard_kommentare
  FOR EACH ROW EXECUTE FUNCTION moodboard_kommentare_set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE moodboard_kommentare ENABLE ROW LEVEL SECURITY;

-- Authenticated: Org-scoped
CREATE POLICY "moodboard_kommentare_org_access" ON moodboard_kommentare
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Anonymous (Kunden): SELECT wenn Moodboard freigegeben + Kommentare erlaubt
CREATE POLICY "moodboard_kommentare_anon_select" ON moodboard_kommentare
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM moodboards m
      WHERE m.id = moodboard_kommentare.moodboard_id
        AND m.freigabe_aktiv = true
        AND m.freigabe_kommentare_aktiv = true
    )
  );

-- Anonymous (Kunden): INSERT wenn Moodboard freigegeben + Kommentare erlaubt + ist_kunde=true
-- Wir setzen organisation_id = die des Moodboards (vom Server)
CREATE POLICY "moodboard_kommentare_anon_insert" ON moodboard_kommentare
  FOR INSERT TO anon
  WITH CHECK (
    ist_kunde = true
    AND autor_user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM moodboards m
      WHERE m.id = moodboard_kommentare.moodboard_id
        AND m.organisation_id = moodboard_kommentare.organisation_id
        AND m.freigabe_aktiv = true
        AND m.freigabe_kommentare_aktiv = true
    )
  );

-- ── Realtime fuer Live-Comments ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'moodboard_kommentare'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE moodboard_kommentare';
  END IF;
END
$$;
