-- ============================================================
-- Migration 090 · Kunden-Website
--
-- Spiegel zur partner.website-Spalte (Migration 086 hat das fuer
-- Partner gemacht). Mit Website + Auto-Favicon kriegt jeder Kunde
-- automatisch ein Logo, sobald die Domain hinterlegt ist.
-- ============================================================

ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS website TEXT;
