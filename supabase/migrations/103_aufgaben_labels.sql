-- ============================================================
-- Migration 103 · Aufgaben-Labels (Trello-Style)
--
-- Bisher hatten Aufgaben einen tags TEXT[] (frei eingegebene Strings).
-- Jetzt: separate Labels-Tabelle pro Org mit Name + Farbe, und
-- aufgaben.label_ids UUID[] verknuepft sie. Damit hat jedes Label
-- ueberall in der Org dieselbe Farbe (Trello-Pattern).
--
-- tags TEXT[] bleibt vorerst — wird in der UI ausgeblendet, aber nicht
-- migriert (kann in Folge-Migration entfernt werden).
-- ============================================================

CREATE TABLE IF NOT EXISTS aufgaben_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  -- HEX-Farbe inkl. # (z.B. #94c1a4)
  farbe           TEXT NOT NULL DEFAULT '#94c1a4'
                  CHECK (farbe ~* '^#[0-9a-f]{6}$'),
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, name)
);

CREATE INDEX IF NOT EXISTS idx_aufgaben_labels_org
  ON aufgaben_labels(organisation_id, reihenfolge);

ALTER TABLE aufgaben_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aufgaben_labels_org_access" ON aufgaben_labels
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION aufgaben_labels_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aufgaben_labels_updated_at ON aufgaben_labels;
CREATE TRIGGER aufgaben_labels_updated_at
  BEFORE UPDATE ON aufgaben_labels
  FOR EACH ROW EXECUTE FUNCTION aufgaben_labels_set_updated_at();

-- Verknuepfung auf aufgaben (UUID-Array — N:M ohne Junction-Table fuer simplere Queries)
ALTER TABLE aufgaben
  ADD COLUMN IF NOT EXISTS label_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

-- GIN-Index fuer Label-Filter (WHERE label_ids @> ARRAY['...']::UUID[])
CREATE INDEX IF NOT EXISTS idx_aufgaben_label_ids
  ON aufgaben USING GIN (label_ids);

-- Realtime-Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'aufgaben_labels'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE aufgaben_labels';
  END IF;
END
$$;
