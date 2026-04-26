-- ============================================================
-- Migration 102 · Aufgaben (Trello-Style Kanban)
--
-- Zentrales ToDo-System mit:
--  - 4 festen Spalten (backlog/in_arbeit/review/erledigt)
--  - Drag&Drop (reihenfolge-Spalte)
--  - Auto-Sync aus 4 Quellen (Reklamation/Bestellung/Meilenstein/Onboarding)
--  - Kunden-Beteiligung im Portal (assignee_kunde)
--  - Inline-Checkliste, Anhaenge, Kommentare
-- ============================================================

-- ── 1) Haupttabelle aufgaben ───────────────────────────────────
CREATE TABLE IF NOT EXISTS aufgaben (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  -- Inhalt
  titel                TEXT NOT NULL CHECK (length(titel) BETWEEN 1 AND 200),
  beschreibung         TEXT,
  -- Workflow-Spalte
  status               TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN (
    'backlog', 'in_arbeit', 'review', 'erledigt'
  )),
  -- Visuelle Position innerhalb der Spalte (Drag&Drop)
  reihenfolge          INTEGER NOT NULL DEFAULT 0,
  -- Prio + Faelligkeit
  prioritaet           TEXT NOT NULL DEFAULT 'normal' CHECK (prioritaet IN (
    'niedrig', 'normal', 'hoch', 'dringend'
  )),
  faellig_am           DATE,
  erledigt_am          TIMESTAMPTZ,
  -- Zuweisung: entweder Team-User ODER Kunde (assignee_kunde=true)
  assignee_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_kunde       BOOLEAN NOT NULL DEFAULT false,
  -- Sichtbarkeit fuer Kunden im Portal (auch wenn nicht assignee)
  sichtbar_fuer_kunde  BOOLEAN NOT NULL DEFAULT false,
  tags                 TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Soft-Verknuepfungen (alle optional)
  kunde_id             UUID REFERENCES kunden(id)             ON DELETE SET NULL,
  projekt_id           UUID REFERENCES projekte(id)           ON DELETE SET NULL,
  raum_id              UUID REFERENCES raeume(id)             ON DELETE SET NULL,
  raum_produkte_id     UUID REFERENCES raum_produkte(id)      ON DELETE SET NULL,
  bestellung_id        UUID REFERENCES lieferanten_bestellungen(id) ON DELETE SET NULL,
  -- Auto-Sync Quelle (analog timeline_events Mig. 075)
  quelle               TEXT NOT NULL DEFAULT 'manuell' CHECK (quelle IN (
    'manuell', 'reklamation', 'bestellung', 'meilenstein', 'onboarding', 'kunde_anfrage'
  )),
  quelle_id            UUID,
  -- Inline-Checkliste: [{id, text, erledigt, position}]
  checklist            JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Storage-URLs der Anhaenge: [{name, url, uploaded_at, mime}]
  anhang_urls          JSONB NOT NULL DEFAULT '[]'::jsonb,
  erstellt_von         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  erstellt_von_kunde   BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotenz-Index fuer Auto-Sync (analog timeline_events)
-- Auto-Quellen (reklamation/bestellung/meilenstein/onboarding) duerfen
-- nur 1x pro quelle_id existieren; manuelle und kunde_anfrage ausgeschlossen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_aufgaben_quelle_unique
  ON aufgaben(organisation_id, quelle, quelle_id)
  WHERE quelle NOT IN ('manuell', 'kunde_anfrage');

-- Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_aufgaben_org_status
  ON aufgaben(organisation_id, status, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_aufgaben_assignee
  ON aufgaben(assignee_user_id) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aufgaben_faellig
  ON aufgaben(faellig_am)
  WHERE status != 'erledigt' AND faellig_am IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aufgaben_projekt
  ON aufgaben(projekt_id) WHERE projekt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aufgaben_kunde
  ON aufgaben(kunde_id) WHERE kunde_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aufgaben_raum
  ON aufgaben(raum_id) WHERE raum_id IS NOT NULL;

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION aufgaben_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aufgaben_updated_at ON aufgaben;
CREATE TRIGGER aufgaben_updated_at
  BEFORE UPDATE ON aufgaben
  FOR EACH ROW EXECUTE FUNCTION aufgaben_set_updated_at();

ALTER TABLE aufgaben ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aufgaben_org_access" ON aufgaben
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 2) Kommentare ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aufgaben_kommentare (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  aufgabe_id       UUID NOT NULL REFERENCES aufgaben(id) ON DELETE CASCADE,
  autor_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_name       TEXT,
  ist_kunde        BOOLEAN NOT NULL DEFAULT false,
  inhalt           TEXT NOT NULL CHECK (length(inhalt) BETWEEN 1 AND 4000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aufgaben_kommentare_aufgabe
  ON aufgaben_kommentare(aufgabe_id, created_at);

ALTER TABLE aufgaben_kommentare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aufgaben_kommentare_org_access" ON aufgaben_kommentare
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 3) Storage-Bucket fuer Anhaenge ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('aufgaben-anhaenge', 'aufgaben-anhaenge', false, 52428800)  -- 50 MB
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "aufgaben_anhaenge_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aufgaben-anhaenge'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "aufgaben_anhaenge_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'aufgaben-anhaenge'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "aufgaben_anhaenge_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'aufgaben-anhaenge'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );


-- ── 4) Realtime-Publication ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'aufgaben'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE aufgaben';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'aufgaben_kommentare'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE aufgaben_kommentare';
  END IF;
END
$$;
