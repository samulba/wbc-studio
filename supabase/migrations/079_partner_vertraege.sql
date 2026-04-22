-- ============================================================
-- Migration 079 · Partner-Verträge (Datei-Upload)
--
-- Verträge die man von Partnern bekommt (Rahmenverträge, NDAs,
-- Konditionsvereinbarungen etc.) hochladen + verwalten. Im
-- Gegensatz zu Kundenverträgen werden diese NICHT selbst erstellt
-- sondern als PDF/DOCX vom Partner empfangen.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_vertraege (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID         NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  partner_id      UUID         NOT NULL REFERENCES partner(id)        ON DELETE CASCADE,
  -- Datei-Metadaten
  dateiname       TEXT         NOT NULL,
  dateityp        TEXT         NOT NULL,
  dateigroesse    INTEGER      NOT NULL,
  storage_pfad    TEXT         NOT NULL,
  -- Inhaltliche Metadaten (optional, für Filter/Übersicht)
  titel           TEXT,
  vertragstyp     TEXT,
  gueltig_von     DATE,
  gueltig_bis     DATE,
  notizen         TEXT,
  -- Audit
  hochgeladen_von UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  hochgeladen_am  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_vertraege_partner
  ON partner_vertraege(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_vertraege_org
  ON partner_vertraege(organisation_id);
CREATE INDEX IF NOT EXISTS idx_partner_vertraege_gueltig_bis
  ON partner_vertraege(gueltig_bis)
  WHERE gueltig_bis IS NOT NULL;

-- updated_at-Trigger (nutzt vorhandene generic-Funktion)
CREATE OR REPLACE FUNCTION partner_vertraege_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partner_vertraege_updated_at ON partner_vertraege;
CREATE TRIGGER partner_vertraege_updated_at
  BEFORE UPDATE ON partner_vertraege
  FOR EACH ROW EXECUTE FUNCTION partner_vertraege_set_updated_at();

-- RLS: Org-scoped
ALTER TABLE partner_vertraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_vertraege_org_access" ON partner_vertraege
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Storage-Bucket: privat (nicht öffentlich)
-- Verträge sollen nur via signed URL abgerufen werden, nicht direkt linkbar.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('partner-vertraege', 'partner-vertraege', false, 52428800)  -- 50 MB
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS — Pfad-Konvention: `<organisation_id>/<partner_id>/<filename>`
-- damit kann RLS am Pfad-Prefix prüfen ob der User zur Org gehört.
CREATE POLICY "pv_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-vertraege'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "pv_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-vertraege'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "pv_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-vertraege'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );
