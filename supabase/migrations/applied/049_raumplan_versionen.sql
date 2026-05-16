-- Migration 049: Raumplan-Versionen (Varianten eines Grundrisses)
-- Erstellt: 2026-04-14

CREATE TABLE IF NOT EXISTS raumplan_versionen (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raum_id          UUID NOT NULL REFERENCES raeume(id) ON DELETE CASCADE,
  organisation_id  UUID REFERENCES organisationen(id),
  name             TEXT NOT NULL DEFAULT 'Variante',
  beschreibung     TEXT,
  grundriss_json   JSONB NOT NULL DEFAULT '{}',
  boden_textur     TEXT DEFAULT 'none',
  wandfarbe        TEXT DEFAULT '#1e293b',
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raumplan_versionen_raum ON raumplan_versionen(raum_id);
CREATE INDEX IF NOT EXISTS idx_raumplan_versionen_org  ON raumplan_versionen(organisation_id);

ALTER TABLE raumplan_versionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org-Mitglieder verwalten Raumplan-Versionen" ON raumplan_versionen
  FOR ALL USING (
    organisation_id = get_user_org_id()
    OR organisation_id IS NULL
  );
