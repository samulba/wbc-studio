-- Migration 035: Demo-Anfragen Tabelle
CREATE TABLE IF NOT EXISTS demo_anfragen (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  telefon     TEXT,
  nachricht   TEXT,
  status      TEXT        NOT NULL DEFAULT 'neu'
                CHECK (status IN ('neu', 'kontaktiert', 'demo_gehalten', 'abgeschlossen')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demo_anfragen ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Insert ohne Auth (Landingpage)
CREATE POLICY "demo_anfragen_insert" ON demo_anfragen
  FOR INSERT WITH CHECK (true);

-- Nur Admins dürfen lesen
CREATE POLICY "demo_anfragen_select_admin" ON demo_anfragen
  FOR SELECT USING (auth.role() = 'service_role');
