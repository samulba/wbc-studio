-- ── 009_kunden_status.sql ─────────────────────────────────────
-- Fügt Status-Feld zu Kunden hinzu
-- Status: aktiv (Standard), abgeschlossen, pausiert

ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktiv'
    CHECK (status IN ('aktiv', 'abgeschlossen', 'pausiert'));
