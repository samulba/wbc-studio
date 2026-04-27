-- ============================================================
-- Migration 105 · Aufgaben-Vorlagen
--
-- Trello-Pattern: gespeicherte Karten-Vorlagen pro Org, die schnell
-- als neue Aufgabe instanziiert werden koennen. Vorlage haelt das
-- gleiche Schema wie eine Aufgabe (titel, beschreibung, prioritaet,
-- checklist, label_ids, sichtbar_fuer_kunde) — kein status/faellig_am
-- (werden beim Erstellen frisch gesetzt).
-- ============================================================

CREATE TABLE IF NOT EXISTS aufgaben_vorlagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  beschreibung    TEXT,
  -- Default-Werte fuer die Aufgabe
  titel           TEXT NOT NULL CHECK (length(titel) BETWEEN 1 AND 200),
  prioritaet      TEXT NOT NULL DEFAULT 'normal' CHECK (prioritaet IN (
    'niedrig', 'normal', 'hoch', 'dringend'
  )),
  checklist       JSONB NOT NULL DEFAULT '[]'::jsonb,
  label_ids       UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  sichtbar_fuer_kunde BOOLEAN NOT NULL DEFAULT false,
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aufgaben_vorlagen_org
  ON aufgaben_vorlagen(organisation_id, reihenfolge);

ALTER TABLE aufgaben_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aufgaben_vorlagen_org_access" ON aufgaben_vorlagen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION aufgaben_vorlagen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aufgaben_vorlagen_updated_at ON aufgaben_vorlagen;
CREATE TRIGGER aufgaben_vorlagen_updated_at
  BEFORE UPDATE ON aufgaben_vorlagen
  FOR EACH ROW EXECUTE FUNCTION aufgaben_vorlagen_set_updated_at();
