-- Migration 046: Custom Möbel für Raumplaner
-- Ermöglicht Firmen eigene Möbelelemente zu erstellen

CREATE TABLE IF NOT EXISTS custom_moebel (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID        REFERENCES organisationen(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  kategorie       TEXT        NOT NULL DEFAULT 'Sonstiges',
  breite_cm       INTEGER     NOT NULL DEFAULT 80,
  laenge_cm       INTEGER     NOT NULL DEFAULT 80,
  farbe           TEXT        NOT NULL DEFAULT '#94c1a4',
  ist_favorit     BOOLEAN     NOT NULL DEFAULT false,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_moebel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org sieht eigene Custom-Möbel" ON custom_moebel
  FOR ALL USING (organisation_id = get_user_org_id());

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_custom_moebel_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_custom_moebel_updated_at
  BEFORE UPDATE ON custom_moebel
  FOR EACH ROW EXECUTE FUNCTION update_custom_moebel_updated_at();
