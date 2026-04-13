-- ============================================================
-- Migration 037 · Kategorien-Tabellen
-- Eigene Tabelle für Produktkategorien, Raumtypen, Projektarten
-- pro Organisation – ersetzt CSV-Strings in einstellungen-Tabelle
-- ============================================================


-- ============================================================
-- 1. TABELLE: kategorien
-- ============================================================

CREATE TABLE IF NOT EXISTS kategorien (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID        NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  typ             TEXT        NOT NULL
                              CHECK (typ IN ('produktkategorie', 'raumtyp', 'projektart')),
  name            TEXT        NOT NULL,
  icon            TEXT        NOT NULL DEFAULT 'Package',
  reihenfolge     INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, typ, name)
);

CREATE OR REPLACE FUNCTION set_kategorien_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_kategorien_updated_at
  BEFORE UPDATE ON kategorien
  FOR EACH ROW EXECUTE FUNCTION set_kategorien_updated_at();


-- ============================================================
-- 2. INDEX auf (organisation_id, typ)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kategorien_org_typ
  ON kategorien(organisation_id, typ);


-- ============================================================
-- 3. RLS: nur eigene Org
-- ============================================================

ALTER TABLE kategorien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kategorien_org_access" ON kategorien
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 4. FK-Spalten auf bestehenden Tabellen (nullable, kein Breaking Change)
-- ============================================================

ALTER TABLE produkte  ADD COLUMN IF NOT EXISTS kategorie_id  UUID REFERENCES kategorien(id) ON DELETE SET NULL;
ALTER TABLE raeume    ADD COLUMN IF NOT EXISTS raumtyp_id    UUID REFERENCES kategorien(id) ON DELETE SET NULL;
ALTER TABLE projekte  ADD COLUMN IF NOT EXISTS projektart_id UUID REFERENCES kategorien(id) ON DELETE SET NULL;
