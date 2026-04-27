-- ============================================================
-- Migration 104 · Aufgaben archivieren
--
-- Trello-Style: Aufgaben werden archiviert statt geloescht. Aus dem
-- Board verschwunden, aber wiederherstellbar im Archiv.
-- archiviert_am IS NULL = sichtbar; IS NOT NULL = archiviert.
-- ============================================================

ALTER TABLE aufgaben
  ADD COLUMN IF NOT EXISTS archiviert_am TIMESTAMPTZ;

-- Partial-Index: Standard-Queries filtern auf NICHT-archivierte
CREATE INDEX IF NOT EXISTS idx_aufgaben_aktiv
  ON aufgaben(organisation_id, status, reihenfolge)
  WHERE archiviert_am IS NULL;
