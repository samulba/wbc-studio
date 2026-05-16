-- ============================================================
-- Migration 087 · Partner-Kontaktpersonen
--
-- Bisher hat ein Partner 1 Ansprechpartner-Namen + 1 globale
-- E-Mail / Telefon. In der Praxis hat man mehrere Kontaktpersonen
-- (Vertrieb, Innendienst, Geschäftsführung, ...) jeweils mit
-- eigenen Kontaktdaten.
--
-- Backfill: bestehende partner.ansprechpartner / email / telefon
-- werden idempotent als "Hauptkontakt" in die neue Tabelle
-- gespiegelt — die alten Spalten bleiben (werden vom App-Code
-- automatisch synchron gehalten, damit Listen / PartnerGrid /
-- PDF-Exports weiter funktionieren ohne JOIN).
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_kontakte (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID         NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  partner_id       UUID         NOT NULL REFERENCES partner(id)        ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_partner_kontakte_partner
  ON partner_kontakte(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_kontakte_org
  ON partner_kontakte(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION partner_kontakte_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partner_kontakte_updated_at ON partner_kontakte;
CREATE TRIGGER partner_kontakte_updated_at
  BEFORE UPDATE ON partner_kontakte
  FOR EACH ROW EXECUTE FUNCTION partner_kontakte_set_updated_at();

-- RLS: Org-scoped (analog zu partner_konditionen)
ALTER TABLE partner_kontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_kontakte_org_access" ON partner_kontakte
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ────────────────────────────────────────────────────────────
-- Backfill bestehender Daten – idempotent
-- ────────────────────────────────────────────────────────────
INSERT INTO partner_kontakte (
  organisation_id, partner_id, name, email, telefon, ist_hauptkontakt, reihenfolge
)
SELECT
  p.organisation_id,
  p.id,
  COALESCE(NULLIF(TRIM(p.ansprechpartner), ''), 'Hauptkontakt'),
  p.email,
  p.telefon,
  true,
  0
FROM partner p
WHERE
  p.deleted_at IS NULL
  AND p.organisation_id IS NOT NULL
  AND (
    NULLIF(TRIM(COALESCE(p.ansprechpartner, '')), '') IS NOT NULL
    OR NULLIF(TRIM(COALESCE(p.email, '')), '')        IS NOT NULL
    OR NULLIF(TRIM(COALESCE(p.telefon, '')), '')      IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM partner_kontakte pk WHERE pk.partner_id = p.id
  );
