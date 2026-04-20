-- ============================================================
-- Migration 057 · Bestell- und Liefer-Tracking auf Produkten
-- ============================================================
-- Erweiterung von produkte um zwei nachvollziehbare Datumsfelder.
-- liefertermin (geplantes Lieferdatum) existiert bereits aus Migration 029.

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS bestellt_am            DATE,
  ADD COLUMN IF NOT EXISTS lieferung_erhalten_am  DATE;

CREATE INDEX IF NOT EXISTS idx_produkte_bestellt_am
  ON produkte(bestellt_am)
  WHERE bestellt_am IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produkte_lieferung_erhalten_am
  ON produkte(lieferung_erhalten_am)
  WHERE lieferung_erhalten_am IS NOT NULL;
