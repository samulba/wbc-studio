-- Einstellungen RLS definitiv fixen
-- Alle bisherigen Policies droppen (verschiedene Namen aus früheren Migrations)
DROP POLICY IF EXISTS "Einstellungen lesen"                   ON einstellungen;
DROP POLICY IF EXISTS "Einstellungen schreiben"               ON einstellungen;
DROP POLICY IF EXISTS "Admins können einstellungen lesen"     ON einstellungen;
DROP POLICY IF EXISTS "Admins können einstellungen schreiben" ON einstellungen;

ALTER TABLE einstellungen ENABLE ROW LEVEL SECURITY;

-- SELECT: jeder authentifizierte Nutzer
CREATE POLICY "einstellungen_select"
  ON einstellungen FOR SELECT
  TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE: jeder authentifizierte Nutzer
CREATE POLICY "einstellungen_write"
  ON einstellungen FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
