-- ============================================================
-- Migration 053 · Angebote & Verträge – vollständige Erweiterung
-- ============================================================
--
-- Was diese Migration macht:
--   1. angebote       – neue Spalten, Status-Enum erweitert
--   2. vertraege      – neue Spalten, Status-Enum erweitert, Vertragsnummer
--   3. angebot_positionen    – neue Tabelle (relationale Positionen)
--   4. vertrag_meilensteine  – neue Tabelle
--   5. vertrag_anhaenge      – neue Tabelle (für Angebot & Vertrag)
--   6. dokument_aktivitaeten – neue Tabelle (Audit-Log)
--   7. Funktion naechste_vertragsnummer
--   8. Indizes & RLS
-- ============================================================


-- ============================================================
-- 1. TABELLE angebote erweitern
-- ============================================================

-- 1a. Status-Constraint aktualisieren (fügt 'angesehen' + 'ueberarbeitung' hinzu)
DO $$
BEGIN
  -- versuche bekannte Auto-Namen zu droppen
  ALTER TABLE angebote DROP CONSTRAINT IF EXISTS angebote_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- In manchen PostgreSQL-Versionen heißt der Auto-Name anders – Fallback via Katalog
DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT conname INTO v_name
    FROM pg_constraint
   WHERE conrelid = 'angebote'::regclass
     AND contype = 'c'
     AND conname LIKE '%status%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE angebote DROP CONSTRAINT IF EXISTS %I', v_name);
  END IF;
END $$;

ALTER TABLE angebote
  ADD CONSTRAINT angebote_status_check
  CHECK (status IN (
    'entwurf','gesendet','angesehen',
    'angenommen','abgelehnt','abgelaufen','ueberarbeitung'
  ));


-- 1b. Neue Spalten
ALTER TABLE angebote
  ADD COLUMN IF NOT EXISTS version           INTEGER        NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vorgaenger_id     UUID           REFERENCES angebote(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zahlungsbedingungen TEXT,
  ADD COLUMN IF NOT EXISTS interne_notizen   TEXT,
  ADD COLUMN IF NOT EXISTS erstellt_von      UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gesendet_am       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS angesehen_am      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beantwortet_am    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS antwort_notiz     TEXT,
  ADD COLUMN IF NOT EXISTS token             TEXT           UNIQUE;

CREATE INDEX IF NOT EXISTS idx_angebote_token
  ON angebote(token) WHERE token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_angebote_status
  ON angebote(organisation_id, status);

CREATE INDEX IF NOT EXISTS idx_angebote_vorgaenger
  ON angebote(vorgaenger_id) WHERE vorgaenger_id IS NOT NULL;


-- ============================================================
-- 2. TABELLE vertraege erweitern
-- ============================================================

-- 2a. Status-Constraint aktualisieren
DO $$
BEGIN
  ALTER TABLE vertraege DROP CONSTRAINT IF EXISTS vertraege_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT conname INTO v_name
    FROM pg_constraint
   WHERE conrelid = 'vertraege'::regclass
     AND contype = 'c'
     AND conname LIKE '%status%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE vertraege DROP CONSTRAINT IF EXISTS %I', v_name);
  END IF;
END $$;

ALTER TABLE vertraege
  ADD CONSTRAINT vertraege_status_check
  CHECK (status IN (
    'entwurf','gesendet','zur_unterschrift',
    'unterschrieben_kunde','kunde_unterschrieben',
    'unterschrieben_beide','aktiv',
    'abgeschlossen','abgelaufen','storniert','gekuendigt'
  ));


-- 2b. Neue Spalten
ALTER TABLE vertraege
  ADD COLUMN IF NOT EXISTS angebot_id               UUID           REFERENCES angebote(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vertragsnummer           TEXT           UNIQUE,
  ADD COLUMN IF NOT EXISTS vertragstyp              TEXT           NOT NULL DEFAULT 'einzelauftrag',
  ADD COLUMN IF NOT EXISTS version                  INTEGER        NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS startdatum               DATE,
  ADD COLUMN IF NOT EXISTS enddatum                 DATE,
  ADD COLUMN IF NOT EXISTS kuendigungsfrist         TEXT,
  ADD COLUMN IF NOT EXISTS gewaehrleistung_monate   INTEGER        NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS interne_notizen          TEXT,
  ADD COLUMN IF NOT EXISTS erstellt_von             UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gesendet_am              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kunde_unterschrift_ip    TEXT,
  ADD COLUMN IF NOT EXISTS kunde_unterschrift_name  TEXT,
  ADD COLUMN IF NOT EXISTS firma_unterschrift_von   UUID           REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2c. vertragstyp CHECK (als separater Schritt weil ADD COLUMN IF NOT EXISTS keinen CHECK erlaubt)
DO $$
DECLARE v_name TEXT;
BEGIN
  SELECT conname INTO v_name
    FROM pg_constraint
   WHERE conrelid = 'vertraege'::regclass
     AND contype = 'c'
     AND conname LIKE '%vertragstyp%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE vertraege DROP CONSTRAINT IF EXISTS %I', v_name);
  END IF;
END $$;

ALTER TABLE vertraege
  ADD CONSTRAINT vertraege_vertragstyp_check
  CHECK (vertragstyp IN (
    'planungsvertrag','ausfuehrungsvertrag',
    'rahmenvertrag','einzelauftrag','wartungsvertrag'
  ));

-- 2d. Indizes
CREATE INDEX IF NOT EXISTS idx_vertraege_angebot
  ON vertraege(angebot_id) WHERE angebot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vertraege_status
  ON vertraege(organisation_id, status);

CREATE INDEX IF NOT EXISTS idx_vertraege_vertragsnummer
  ON vertraege(organisation_id, vertragsnummer) WHERE vertragsnummer IS NOT NULL;


-- ============================================================
-- 3. TABELLE: angebot_positionen (relationale Alternative zu JSONB)
-- ============================================================
-- Hinweis: Die bestehende JSONB-Spalte "positionen" in angebote bleibt erhalten.
-- Diese Tabelle ist für die neue, normalisierte Variante gedacht.

CREATE TABLE IF NOT EXISTS angebot_positionen (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID          NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  angebot_id          UUID          NOT NULL REFERENCES angebote(id)       ON DELETE CASCADE,
  raum_id             UUID                   REFERENCES raeume(id)         ON DELETE SET NULL,
  raum_produkt_id     UUID                   REFERENCES raum_produkte(id)  ON DELETE SET NULL,
  position            INTEGER       NOT NULL DEFAULT 0,
  typ                 TEXT          NOT NULL DEFAULT 'standard'
                      CHECK (typ IN ('standard','optional','alternativ')),
  gruppe              TEXT,           -- Alternativ-Gruppe: A, B, C …
  bezeichnung         TEXT          NOT NULL,
  beschreibung        TEXT,
  menge               NUMERIC(10,2) NOT NULL DEFAULT 1,
  einheit             TEXT          NOT NULL DEFAULT 'Stk',
  ep_netto            NUMERIC(12,2),  -- Einkaufspreis – NIE an Kunde
  vp_netto            NUMERIC(12,2),  -- Verkaufspreis netto
  rabatt_prozent      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  gesamt_netto        NUMERIC(12,2),
  vom_kunden_gewaehlt BOOLEAN       NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_angebot_positionen_angebot
  ON angebot_positionen(angebot_id);

CREATE INDEX IF NOT EXISTS idx_angebot_positionen_org
  ON angebot_positionen(organisation_id);

ALTER TABLE angebot_positionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "angebot_positionen_org_access" ON angebot_positionen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 4. TABELLE: vertrag_meilensteine
-- ============================================================

CREATE TABLE IF NOT EXISTS vertrag_meilensteine (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID          NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  vertrag_id      UUID          NOT NULL REFERENCES vertraege(id)      ON DELETE CASCADE,
  titel           TEXT          NOT NULL,
  beschreibung    TEXT,
  reihenfolge     INTEGER       NOT NULL DEFAULT 0,
  faellig_am      DATE,
  betrag          NUMERIC(12,2),
  prozent         NUMERIC(5,2),   -- % der Vertragssumme (alternativ zu betrag)
  status          TEXT          NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen','in_arbeit','erledigt','abgerechnet')),
  erledigt_am     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meilensteine_vertrag
  ON vertrag_meilensteine(vertrag_id);

CREATE INDEX IF NOT EXISTS idx_meilensteine_org
  ON vertrag_meilensteine(organisation_id);

ALTER TABLE vertrag_meilensteine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vertrag_meilensteine_org_access" ON vertrag_meilensteine
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

CREATE TRIGGER trg_meilensteine_updated_at
  BEFORE UPDATE ON vertrag_meilensteine
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. TABELLE: vertrag_anhaenge
-- ============================================================
-- Ein Anhang kann entweder an einem Vertrag ODER an einem Angebot hängen.
-- Mindestens eine der beiden FKs muss gesetzt sein (CHECK).

CREATE TABLE IF NOT EXISTS vertrag_anhaenge (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID         NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  vertrag_id       UUID                  REFERENCES vertraege(id)      ON DELETE CASCADE,
  angebot_id       UUID                  REFERENCES angebote(id)       ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  dateityp         TEXT,
  datei_url        TEXT,
  groesse          INTEGER,
  hochgeladen_von  UUID                  REFERENCES auth.users(id)     ON DELETE SET NULL,
  hochgeladen_am   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT anhaenge_min_bezug CHECK (
    vertrag_id IS NOT NULL OR angebot_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_anhaenge_vertrag
  ON vertrag_anhaenge(vertrag_id) WHERE vertrag_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anhaenge_angebot
  ON vertrag_anhaenge(angebot_id) WHERE angebot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anhaenge_org
  ON vertrag_anhaenge(organisation_id);

ALTER TABLE vertrag_anhaenge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vertrag_anhaenge_org_access" ON vertrag_anhaenge
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 6. TABELLE: dokument_aktivitaeten
-- ============================================================

CREATE TABLE IF NOT EXISTS dokument_aktivitaeten (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID         NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  dokument_typ    TEXT         NOT NULL CHECK (dokument_typ IN ('angebot','vertrag')),
  dokument_id     UUID         NOT NULL,
  aktion          TEXT         NOT NULL,  -- erstellt / bearbeitet / gesendet / angesehen /
                                          -- unterschrieben / kommentiert / status_geaendert / gelöscht
  details         TEXT,
  alter_status    TEXT,
  neuer_status    TEXT,
  user_id         UUID                  REFERENCES auth.users(id)    ON DELETE SET NULL,
  kunde_name      TEXT,         -- falls Kunde ohne Login handelt
  ip_adresse      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dok_aktivitaeten_dokument
  ON dokument_aktivitaeten(dokument_typ, dokument_id);

CREATE INDEX IF NOT EXISTS idx_dok_aktivitaeten_org
  ON dokument_aktivitaeten(organisation_id);

CREATE INDEX IF NOT EXISTS idx_dok_aktivitaeten_created
  ON dokument_aktivitaeten(organisation_id, created_at DESC);

ALTER TABLE dokument_aktivitaeten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dok_aktivitaeten_org_access" ON dokument_aktivitaeten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Anonyme Kunden dürfen Aktivitäten eintragen (Angesehen, Unterschrift usw.)
CREATE POLICY "dok_aktivitaeten_anon_insert" ON dokument_aktivitaeten
  FOR INSERT TO anon
  WITH CHECK (true);


-- ============================================================
-- 7. FUNKTION: Nächste Vertragsnummer pro Organisation
--    Format: VTR-YYYY-NNN  (dreistellig, führende Nullen)
-- ============================================================

CREATE OR REPLACE FUNCTION naechste_vertragsnummer(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_jahr    TEXT;
  v_zaehler INTEGER;
BEGIN
  v_jahr := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1
    INTO v_zaehler
    FROM vertraege
   WHERE organisation_id = org_id
     AND (vertragsnummer LIKE 'VTR-' || v_jahr || '-%'
          OR (vertragsnummer IS NULL
              AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())));
  RETURN 'VTR-' || v_jahr || '-' || lpad(v_zaehler::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 8. Bestehende Verträge: vertragsnummer nachfüllen
--    (optional – nur wenn bereits Datensätze existieren)
-- ============================================================

DO $$
DECLARE
  rec        RECORD;
  v_jahr     TEXT;
  v_zaehler  INTEGER;
  v_num      TEXT;
BEGIN
  v_zaehler := 0;
  FOR rec IN
    SELECT id, organisation_id, created_at
      FROM vertraege
     WHERE vertragsnummer IS NULL
     ORDER BY organisation_id, created_at
  LOOP
    v_jahr    := to_char(rec.created_at, 'YYYY');
    v_zaehler := v_zaehler + 1;
    v_num     := 'VTR-' || v_jahr || '-' || lpad(v_zaehler::text, 3, '0');
    -- Unique-Konflikt abfangen
    BEGIN
      UPDATE vertraege SET vertragsnummer = v_num WHERE id = rec.id;
    EXCEPTION WHEN unique_violation THEN
      v_zaehler := v_zaehler + 1;
      v_num     := 'VTR-' || v_jahr || '-' || lpad(v_zaehler::text, 3, '0');
      UPDATE vertraege SET vertragsnummer = v_num WHERE id = rec.id;
    END;
  END LOOP;
END $$;
