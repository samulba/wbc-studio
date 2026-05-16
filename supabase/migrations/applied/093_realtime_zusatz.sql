-- ============================================================
-- Migration 093 · Realtime fuer weitere Bereiche
--
-- Aktiviert Realtime-Publication fuer Tabellen, die fuer Live-Updates
-- in der App benoetigt werden:
--
--  - client_nachrichten — Portal-Chat
--  - kommunikation — Kommunikationslog auf Kunden-Detail
--  - timeline_events — Live-Events auf Projekt-Timeline
--  - raum_produkte — Live-Bestell-/Freigabe-Status auf Projekt-Detail
--  - konfigurator_auswahl — Admin sieht Kundenauswahl live
--
-- RLS bleibt aktiv: jeder Browser sieht nur Events, die ihm seine
-- Org-scoped Policies erlauben.
-- ============================================================

DO $$
BEGIN
  -- client_nachrichten
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_nachrichten'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE client_nachrichten';
  END IF;

  -- kommunikation
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'kommunikation'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE kommunikation';
  END IF;

  -- timeline_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'timeline_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE timeline_events';
  END IF;

  -- raum_produkte (Bestell-/Freigabe-Status pro Einsatz)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'raum_produkte'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE raum_produkte';
  END IF;

  -- konfigurator_auswahl (Kunden-Entscheidungen live)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'konfigurator_auswahl'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE konfigurator_auswahl';
  END IF;
END
$$;
