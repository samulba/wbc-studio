-- ============================================================
-- Migration 091 · Kunden-Kontaktpersonen
--
-- Spiegel zur partner_kontakte (Migration 087): mehrere
-- Kontaktpersonen pro Kunde mit eigenen Daten (Name, Rolle,
-- E-Mail, Telefon, Mobil, Notizen).
--
-- Backfill: bestehende kunden.ansprechpartner / email / telefon
-- werden idempotent als "Hauptkontakt" gespiegelt — die alten
-- Spalten bleiben (App-Code haelt sie automatisch synchron).
-- ============================================================

CREATE TABLE IF NOT EXISTS kunden_kontakte (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID         NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  kunde_id         UUID         NOT NULL REFERENCES kunden(id)         ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  rolle            TEXT,
  email            TEXT,
  telefon          TEXT,
  mobil            TEXT,
  notizen          TEXT,
  ist_hauptkontakt BOOLEAN      NOT NULL DEFAULT false,
  reihenfolge      INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kunden_kontakte_kunde
  ON kunden_kontakte(kunde_id);
CREATE INDEX IF NOT EXISTS idx_kunden_kontakte_org
  ON kunden_kontakte(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION kunden_kontakte_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kunden_kontakte_updated_at ON kunden_kontakte;
CREATE TRIGGER kunden_kontakte_updated_at
  BEFORE UPDATE ON kunden_kontakte
  FOR EACH ROW EXECUTE FUNCTION kunden_kontakte_set_updated_at();

-- RLS: Org-scoped
ALTER TABLE kunden_kontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunden_kontakte_org_access" ON kunden_kontakte
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ────────────────────────────────────────────────────────────
-- Backfill bestehender Daten – idempotent
-- ────────────────────────────────────────────────────────────
INSERT INTO kunden_kontakte (
  organisation_id, kunde_id, name, email, telefon, ist_hauptkontakt, reihenfolge
)
SELECT
  k.organisation_id,
  k.id,
  COALESCE(NULLIF(TRIM(k.ansprechpartner), ''), 'Hauptkontakt'),
  k.email,
  k.telefon,
  true,
  0
FROM kunden k
WHERE
  k.deleted_at IS NULL
  AND k.organisation_id IS NOT NULL
  AND (
    NULLIF(TRIM(COALESCE(k.ansprechpartner, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(k.email, '')), '')        IS NOT NULL
    OR NULLIF(TRIM(COALESCE(k.telefon, '')), '')      IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM kunden_kontakte kk WHERE kk.kunde_id = k.id
  );
