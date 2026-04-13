-- Migration 034: Sektionen für Onboarding-Vorlagen
-- Fügt eine JSONB-Spalte für Sektionen (Gruppen) zu Onboarding-Vorlagen hinzu.

ALTER TABLE onboarding_vorlagen
  ADD COLUMN IF NOT EXISTS sektionen JSONB NOT NULL DEFAULT '[]'::jsonb;
