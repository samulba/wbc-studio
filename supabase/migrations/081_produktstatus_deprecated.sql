-- ============================================================
-- Migration 081 · produktstatus-Tabelle deprecaten
--
-- Seit Migration 078 ist raum_produkte.freigabe_status die Single
-- Source of Truth für Freigabe-Status. Die alte produktstatus-
-- Tabelle wird nicht mehr geschrieben und nicht mehr gelesen.
--
-- Tabelle bleibt für 1 Release als Sicherheitspuffer erhalten,
-- damit ein Rollback möglich wäre. Nach diesem Release kann sie
-- per DROP TABLE entfernt werden.
-- ============================================================

COMMENT ON TABLE produktstatus IS
  'DEPRECATED seit Migration 078 (2026-04). Wird nicht mehr geschrieben. Single Source of Truth: raum_produkte.freigabe_status + raum_produkte.freigabe_kommentar. Kann in nächstem Release gedropt werden.';
