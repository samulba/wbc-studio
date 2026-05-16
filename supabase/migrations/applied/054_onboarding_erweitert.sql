-- ============================================================
-- Migration 054: Onboarding-System – Vollständige Erweiterung
-- ============================================================
-- Erweitert das bestehende Onboarding-System um:
--   1. Onboarding-Typ (neukunde / projekt / universal)
--   2. Erweiterter Status-Flow + Auto-Save + Fortschritt
--   3. White-Label-Einstellungen pro Vorlage
--   4. Conditional Logic, neue Feld-Typen (Slider, Upload, etc.)
--   5. Neue Tabelle: onboarding_dateien (File-Uploads)
--   6. Neue Tabelle: onboarding_inventar (Bestand erfassen)
--   7. Neue Tabelle: onboarding_prioritaeten (Drag-&-Drop-Ranking)
--   8. RLS – alle Tabellen org-scoped
-- ============================================================

-- ── 1. onboarding_anfragen erweitern ─────────────────────────

-- Status um 'in_bearbeitung' und 'abgelaufen' erweitern
-- (ALTER COLUMN + DROP CONSTRAINT safe via DO-Block)
DO $$
DECLARE v_name TEXT;
BEGIN
  SELECT conname INTO v_name
  FROM   pg_constraint
  WHERE  conrelid = 'onboarding_anfragen'::regclass
    AND  contype  = 'c'
    AND  conname  LIKE '%status%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE onboarding_anfragen DROP CONSTRAINT IF EXISTS %I', v_name);
  END IF;
END $$;

ALTER TABLE onboarding_anfragen
  ADD CONSTRAINT onboarding_anfragen_status_check
  CHECK (status IN ('offen','in_bearbeitung','abgeschlossen','abgelehnt','abgelaufen'));

-- Neue Spalten auf onboarding_anfragen
ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS typ               text    NOT NULL DEFAULT 'neukunde'
    CHECK (typ IN ('neukunde','projekt','universal')),
  ADD COLUMN IF NOT EXISTS organisation_id  uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS projekt_id       uuid    REFERENCES projekte(id)   ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kunde_id         uuid    REFERENCES kunden(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fortschritt      int     NOT NULL DEFAULT 0 CHECK (fortschritt BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS aktuelle_sektion int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_save        jsonb,
  ADD COLUMN IF NOT EXISTS abgeschlossen_am timestamptz,
  ADD COLUMN IF NOT EXISTS gueltig_bis      timestamptz,
  ADD COLUMN IF NOT EXISTS letzte_aktivitaet timestamptz;

-- Hint: organisation_id via get_user_org_id()-Logik wird über Actions befüllt.
-- Spalte ist nullable damit bestehende Zeilen erhalten bleiben.

-- RLS: bestehende Policies droppen und org-scoped neu anlegen
DROP POLICY IF EXISTS "authenticated_full_access" ON onboarding_anfragen;

-- Authentifizierte Nutzer: nur eigene Org
CREATE POLICY "org_anfragen_select" ON onboarding_anfragen
  FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id() OR organisation_id IS NULL);

CREATE POLICY "org_anfragen_insert" ON onboarding_anfragen
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "org_anfragen_update" ON onboarding_anfragen
  FOR UPDATE TO authenticated
  USING (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "org_anfragen_delete" ON onboarding_anfragen
  FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id());

-- Öffentlich (Kunden füllen Formular ohne Login aus)
CREATE POLICY "public_anfragen_select" ON onboarding_anfragen
  FOR SELECT TO anon
  USING (status IN ('offen','in_bearbeitung'));

CREATE POLICY "public_anfragen_update" ON onboarding_anfragen
  FOR UPDATE TO anon
  USING (status IN ('offen','in_bearbeitung'))
  WITH CHECK (status IN ('offen','in_bearbeitung','abgeschlossen'));


-- ── 2. onboarding_vorlagen erweitern ─────────────────────────

ALTER TABLE onboarding_vorlagen
  ADD COLUMN IF NOT EXISTS organisation_id  uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS typ              text    NOT NULL DEFAULT 'neukunde'
    CHECK (typ IN ('neukunde','projekt','universal')),
  -- White-Label
  ADD COLUMN IF NOT EXISTS einleitung_text  text,
  ADD COLUMN IF NOT EXISTS abschluss_text   text,
  ADD COLUMN IF NOT EXISTS logo_url         text,
  ADD COLUMN IF NOT EXISTS akzent_farbe     text,
  ADD COLUMN IF NOT EXISTS redirect_url     text,
  -- E-Mail-Benachrichtigung
  ADD COLUMN IF NOT EXISTS email_betreff    text,
  ADD COLUMN IF NOT EXISTS email_text       text,
  -- Gültigkeit des Links in Tagen (NULL = unbegrenzt)
  ADD COLUMN IF NOT EXISTS deadline_tage    int;

-- RLS: bestehende Policy droppen und org-scoped neu anlegen
DROP POLICY IF EXISTS "Authenticated can manage vorlagen" ON onboarding_vorlagen;

CREATE POLICY "org_vorlagen_all" ON onboarding_vorlagen
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

-- Öffentlich lesbar (für Kunden-Formular)
CREATE POLICY "public_vorlagen_select" ON onboarding_vorlagen
  FOR SELECT TO anon
  USING (true);


-- ── 3. Tabelle: onboarding_dateien ───────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_dateien (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  frage_id        text,                           -- optionale Zuordnung zu Frage-ID
  dateiname       text        NOT NULL,
  dateityp        text        NOT NULL,            -- MIME-type
  dateigroesse    bigint,                          -- Bytes
  storage_pfad    text        NOT NULL,            -- Supabase Storage path
  vorschau_url    text,                            -- Public URL für Thumbnails
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_dateien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_dateien_all" ON onboarding_dateien
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_dateien_insert" ON onboarding_dateien
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "public_dateien_select" ON onboarding_dateien
  FOR SELECT TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_dateien_anfrage ON onboarding_dateien(anfrage_id);


-- ── 4. Tabelle: onboarding_inventar ──────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_inventar (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  bezeichnung     text        NOT NULL,
  kategorie       text,                            -- z. B. 'Möbel', 'Beleuchtung'
  raum            text,                            -- Raumzuordnung
  zustand         text        CHECK (zustand IN ('sehr_gut','gut','mittel','schlecht') OR zustand IS NULL),
  behalten        boolean     NOT NULL DEFAULT true,
  foto_url        text,                            -- Supabase Storage path
  notizen         text,
  reihenfolge     int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_inventar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_inventar_all" ON onboarding_inventar
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_inventar_all" ON onboarding_inventar
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_inventar_anfrage ON onboarding_inventar(anfrage_id);

CREATE OR REPLACE FUNCTION update_onboarding_inventar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_inventar_updated_at
  BEFORE UPDATE ON onboarding_inventar
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_inventar_updated_at();


-- ── 5. Tabelle: onboarding_prioritaeten ──────────────────────

CREATE TABLE IF NOT EXISTS onboarding_prioritaeten (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  frage_id        text,                            -- Zuordnung zu Frage-ID in Vorlage
  bezeichnung     text        NOT NULL,
  icon            text,                            -- Lucide Icon-Name oder Emoji
  reihenfolge     int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_prioritaeten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_prioritaeten_all" ON onboarding_prioritaeten
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_prioritaeten_all" ON onboarding_prioritaeten
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_prioritaeten_anfrage ON onboarding_prioritaeten(anfrage_id);


-- ── 6. Updated-at-Trigger für onboarding_anfragen ────────────
-- (bestehender Trigger bleibt – Funktion nur ersetzen)
CREATE OR REPLACE FUNCTION update_onboarding_anfragen_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at        = now();
  NEW.letzte_aktivitaet = now();
  RETURN NEW;
END;
$$;

-- Trigger bereits vorhanden, kein CREATE TRIGGER nötig


-- ── 7. Indizes für Performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_anfragen_org  ON onboarding_anfragen(organisation_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_anfragen_status ON onboarding_anfragen(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_anfragen_token  ON onboarding_anfragen(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_vorlagen_org   ON onboarding_vorlagen(organisation_id);
