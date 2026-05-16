-- ============================================================
-- Migration 101 · Garantie-Tracking + Kommunikation pro Produkt
--
-- 1) gewaehrleistung_bis auf raum_produkte (auto: lieferung_erhalten_am + 24M)
-- 2) raum_produkte_id (optional) auf kommunikation
-- ============================================================

-- ── 1) Gewaehrleistungs-Tracking ───────────────────────────────
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS gewaehrleistung_bis DATE,
  ADD COLUMN IF NOT EXISTS gewaehrleistung_monate INTEGER NOT NULL DEFAULT 24;

-- Auto-Berechnung: Wenn lieferung_erhalten_am gesetzt wird und gewaehrleistung_bis
-- noch null ist, dann gewaehrleistung_bis = lieferung_erhalten_am + gewaehrleistung_monate
CREATE OR REPLACE FUNCTION raum_produkte_gewaehrleistung_auto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lieferung_erhalten_am IS NOT NULL
     AND NEW.gewaehrleistung_bis IS NULL
     AND NEW.gewaehrleistung_monate > 0 THEN
    NEW.gewaehrleistung_bis := (NEW.lieferung_erhalten_am::DATE + (NEW.gewaehrleistung_monate || ' months')::INTERVAL)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS raum_produkte_gewaehrleistung_trigger ON raum_produkte;
CREATE TRIGGER raum_produkte_gewaehrleistung_trigger
  BEFORE INSERT OR UPDATE OF lieferung_erhalten_am, gewaehrleistung_monate ON raum_produkte
  FOR EACH ROW EXECUTE FUNCTION raum_produkte_gewaehrleistung_auto();

-- Backfill bestehender Daten
UPDATE raum_produkte
SET gewaehrleistung_bis = (lieferung_erhalten_am::DATE + INTERVAL '24 months')::DATE
WHERE lieferung_erhalten_am IS NOT NULL AND gewaehrleistung_bis IS NULL;

-- raum_produkte hat (anders als produkte) keine deleted_at-Spalte —
-- Eintraege werden hart geloescht. Index nur auf gewaehrleistung_bis.
CREATE INDEX IF NOT EXISTS idx_raum_produkte_gewaehrleistung_bis
  ON raum_produkte(gewaehrleistung_bis)
  WHERE gewaehrleistung_bis IS NOT NULL;


-- ── 2) Kommunikation pro Produkt ───────────────────────────────
ALTER TABLE kommunikation
  ADD COLUMN IF NOT EXISTS raum_produkte_id UUID REFERENCES raum_produkte(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kommunikation_raum_produkt
  ON kommunikation(raum_produkte_id) WHERE raum_produkte_id IS NOT NULL;
