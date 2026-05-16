-- ============================================================
-- Migration 094 · Realtime fuer audit_log
--
-- Damit das neue Aktivitäts-Log unter Einstellungen → Aktivität
-- live aktualisiert wird, wenn andere Team-Mitglieder Aktionen
-- ausführen. RLS bleibt aktiv (org-scoped).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE audit_log';
  END IF;
END
$$;
