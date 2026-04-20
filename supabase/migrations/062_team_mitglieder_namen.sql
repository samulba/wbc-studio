-- ============================================================
-- Migration 062 · Vor- und Nachname pro Team-Mitglied
-- ============================================================
-- Ergänzt team_mitglieder um vorname/nachname-Felder, damit Nutzer
-- unter Einstellungen > Profil ihren Namen pflegen können.

ALTER TABLE team_mitglieder
  ADD COLUMN IF NOT EXISTS vorname   TEXT,
  ADD COLUMN IF NOT EXISTS nachname  TEXT;

COMMENT ON COLUMN team_mitglieder.vorname  IS 'Vorname des Nutzers (vom Nutzer selbst gepflegt, Einstellungen > Profil)';
COMMENT ON COLUMN team_mitglieder.nachname IS 'Nachname des Nutzers (vom Nutzer selbst gepflegt, Einstellungen > Profil)';
