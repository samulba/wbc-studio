-- ============================================================
-- Migration 044 · Angebotsmodul
-- ============================================================


-- ============================================================
-- 1. TABELLE: angebote
-- ============================================================

CREATE TABLE IF NOT EXISTS angebote (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id       UUID                 REFERENCES projekte(id)       ON DELETE SET NULL,
  kunde_id         UUID        NOT NULL REFERENCES kunden(id)         ON DELETE RESTRICT,
  nummer           TEXT        NOT NULL,              -- z.B. "AG-2026-001"
  titel            TEXT        NOT NULL,
  einleitung       TEXT,
  positionen       JSONB       NOT NULL DEFAULT '[]', -- [{id,name,beschreibung,menge,einheit,einzelpreis,gesamtpreis}]
  netto_summe      NUMERIC(12,2),
  mwst_satz        NUMERIC(5,2) NOT NULL DEFAULT 19,
  mwst_betrag      NUMERIC(12,2),
  brutto_summe     NUMERIC(12,2),
  rabatt_prozent   NUMERIC(5,2),
  rabatt_betrag    NUMERIC(12,2),
  status           TEXT        NOT NULL DEFAULT 'entwurf'
                   CHECK (status IN ('entwurf','gesendet','angenommen','abgelehnt','abgelaufen')),
  gueltig_bis      DATE,
  pdf_url          TEXT,
  anmerkungen      TEXT,
  agb_text         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. Indizes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_angebote_org_kunde
  ON angebote(organisation_id, kunde_id);

CREATE INDEX IF NOT EXISTS idx_angebote_projekt
  ON angebote(projekt_id)
  WHERE projekt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_angebote_nummer
  ON angebote(organisation_id, nummer);


-- ============================================================
-- 3. RLS: nur eigene Org
-- ============================================================

ALTER TABLE angebote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "angebote_org_access" ON angebote
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 4. updated_at Trigger
-- ============================================================

CREATE TRIGGER trg_angebote_updated_at
  BEFORE UPDATE ON angebote
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 5. Funktion: Nächste Angebotsnummer pro Organisation
--    Format: AG-YYYY-NNN (dreistellig, mit führenden Nullen)
-- ============================================================

CREATE OR REPLACE FUNCTION naechste_angebotsnummer(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_jahr    TEXT;
  v_zaehler INTEGER;
BEGIN
  v_jahr := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1
    INTO v_zaehler
    FROM angebote
   WHERE organisation_id = org_id
     AND nummer LIKE 'AG-' || v_jahr || '-%';
  RETURN 'AG-' || v_jahr || '-' || lpad(v_zaehler::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
