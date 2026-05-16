-- Migration 047: Öffentliche Raumplan-Freigabe
-- Ermöglicht das Teilen eines Grundrisses via Token-Link

ALTER TABLE raeume ADD COLUMN IF NOT EXISTS freigabe_token  UUID        DEFAULT gen_random_uuid();
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS freigabe_aktiv  BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS freigabe_erstellt_am TIMESTAMPTZ;

-- Sicherstellen, dass jeder Raum einen Token hat (Backfill für bestehende Zeilen)
UPDATE raeume SET freigabe_token = gen_random_uuid() WHERE freigabe_token IS NULL;
