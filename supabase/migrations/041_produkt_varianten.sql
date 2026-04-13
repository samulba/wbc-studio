-- ============================================================
-- Migration 041 · Produkt-Varianten
-- ============================================================


-- ============================================================
-- 1. Neue Spalten auf produkte
-- ============================================================

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS ist_variante          BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS eltern_produkt_id     UUID     REFERENCES produkte(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS varianten_attribute   JSONB;   -- z.B. {"farbe": "Eiche", "groesse": "120x80"}

CREATE INDEX IF NOT EXISTS idx_produkte_eltern ON produkte(eltern_produkt_id)
  WHERE eltern_produkt_id IS NOT NULL;


-- ============================================================
-- 2. TABELLE: varianten_definitionen
--    Definiert welche Attribute + Optionen ein Basisprodukt hat
-- ============================================================

CREATE TABLE IF NOT EXISTS varianten_definitionen (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID    NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  produkt_id      UUID    NOT NULL REFERENCES produkte(id)       ON DELETE CASCADE,
  attribut_name   TEXT    NOT NULL,  -- z.B. "Farbe", "Material", "Größe"
  optionen        TEXT[]  NOT NULL,  -- z.B. ["Eiche", "Buche", "Walnuss"]
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (produkt_id, attribut_name)
);

CREATE INDEX IF NOT EXISTS idx_varianten_def_produkt ON varianten_definitionen(produkt_id);


-- ============================================================
-- 3. RLS: nur eigene Org
-- ============================================================

ALTER TABLE varianten_definitionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "varianten_definitionen_org_access" ON varianten_definitionen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());
