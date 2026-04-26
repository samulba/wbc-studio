-- ============================================================
-- Migration 099 · Moodboard Status (Entwurf / Abstimmung / Freigegeben / Archiviert)
--
-- Status ist eine separate Workflow-Spalte und unabhaengig vom
-- freigabe_aktiv-Flag (das ist technische Sichtbarkeit fuer
-- Kunden via Token-Link). status ist die Workflow-Phase.
-- ============================================================

ALTER TABLE moodboards
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'entwurf'
    CHECK (status IN ('entwurf', 'abstimmung', 'freigegeben', 'archiviert'));

CREATE INDEX IF NOT EXISTS idx_moodboards_status
  ON moodboards(organisation_id, status);
