-- ============================================================
-- Migration 086 · Partner-Adresse
--
-- Bisher gab es kein Adress-Feld auf der partner-Tabelle.
-- Wir folgen dem gleichen Muster wie kunden.adresse:
-- ein einfaches Freitext-Feld (mehrzeilig im UI).
-- ============================================================

ALTER TABLE partner
  ADD COLUMN IF NOT EXISTS adresse TEXT;
