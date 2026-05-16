-- ============================================================
-- Migration 111 · Onboarding-Tabellen: organisation_id FK fixen
--
-- Migrationen 054 und 055 haben die organisation_id-Spalte falsch
-- referenziert: `REFERENCES auth.users(id)` statt
-- `REFERENCES organisationen(id)`. Das fuehrt beim INSERT mit echter
-- Org-UUID zu einem Foreign-Key-Verletzungsfehler — Upload + andere
-- Operationen sind dadurch komplett gebrochen.
--
-- Diese Migration:
--   1) Droppt den fehlerhaften FK-Constraint (idempotent),
--   2) Legt ihn neu auf organisationen(id) an.
--
-- Datenwerte werden NICHT angefasst — der Spalten-Inhalt bleibt
-- bestehen, nur die Constraint-Definition aendert sich.
-- ============================================================

DO $$
DECLARE
  tabelle TEXT;
  constraint_name TEXT;
  tabellen TEXT[] := ARRAY[
    'onboarding_anfragen',
    'onboarding_vorlagen',
    'onboarding_dateien',
    'onboarding_inventar',
    'onboarding_prioritaeten',
    'onboarding_sektionen',
    'onboarding_budget_verteilung',
    'onboarding_entscheider',
    'onboarding_branding',
    'onboarding_checkliste'
  ];
BEGIN
  FOREACH tabelle IN ARRAY tabellen LOOP
    -- Tabelle existiert pruefen — manche Migrationen koennen ausstehen
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tabelle
    ) THEN
      -- Alle FK-Constraints auf organisation_id finden, die NICHT auf
      -- organisationen verweisen — droppen
      FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = tabelle
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'organisation_id'
          AND ccu.table_name <> 'organisationen'
      LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tabelle, constraint_name);
      END LOOP;

      -- Falls noch kein korrekter FK existiert: anlegen
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = tabelle
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'organisation_id'
          AND ccu.table_name = 'organisationen'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (organisation_id) REFERENCES organisationen(id) ON DELETE CASCADE',
          tabelle,
          tabelle || '_organisation_id_fkey'
        );
      END IF;
    END IF;
  END LOOP;
END $$;
