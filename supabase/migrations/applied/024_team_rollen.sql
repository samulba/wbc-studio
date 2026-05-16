-- 024: Team-Rollen-System
-- Ersetzt user_metadata-basierte Rollen durch eine dedizierte Tabelle.
-- Rollen: admin | editor | viewer
-- Status: ausstehend | aktiv | deaktiviert

CREATE TABLE IF NOT EXISTS team_mitglieder (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  eingeladen_von      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email               text        NOT NULL,
  rolle               text        NOT NULL DEFAULT 'viewer'
                                  CHECK (rolle IN ('admin', 'editor', 'viewer')),
  status              text        NOT NULL DEFAULT 'ausstehend'
                                  CHECK (status IN ('ausstehend', 'aktiv', 'deaktiviert')),
  einladungs_token    text        UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_team_mitglieder_user_id ON team_mitglieder(user_id);
CREATE INDEX IF NOT EXISTS idx_team_mitglieder_token   ON team_mitglieder(einladungs_token);

-- Updated-at-Trigger
CREATE OR REPLACE FUNCTION update_team_mitglieder_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_team_updated_at
  BEFORE UPDATE ON team_mitglieder
  FOR EACH ROW EXECUTE FUNCTION update_team_mitglieder_updated_at();

-- RLS: Nur eingeloggte Nutzer dürfen ihre eigene Zeile lesen.
-- Server-Actions nutzen den Admin-Client (bypasses RLS).
ALTER TABLE team_mitglieder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_record_select" ON team_mitglieder
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
