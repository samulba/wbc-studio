-- ============================================================
-- Migration 095 · Audit-Log Backfill für existierende Datensätze
--
-- Bevor das Aktivitätslog eingeführt wurde, gab es keine Einträge.
-- Damit User in der UI sofort eine sinnvolle History sehen, legen
-- wir pro existierendem Kunden / Projekt / Partner / Angebot /
-- Vertrag einen synthetischen "X angelegt"-Audit-Eintrag an —
-- mit dem ursprünglichen created_at-Timestamp.
--
-- Idempotent via NOT EXISTS-Check (Aktion + Entität + ID-Tupel
-- darf nur einmal existieren).
-- ============================================================

-- Kunden
INSERT INTO audit_log (
  organisation_id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, created_at
)
SELECT
  k.organisation_id, NULL, NULL, 'kunde_angelegt', 'kunde', k.id, k.name, k.created_at
FROM kunden k
WHERE
  k.organisation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.aktion = 'kunde_angelegt' AND a.entitaet_typ = 'kunde' AND a.entitaet_id = k.id
  );

-- Projekte
INSERT INTO audit_log (
  organisation_id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, created_at
)
SELECT
  p.organisation_id, NULL, NULL, 'projekt_angelegt', 'projekt', p.id, p.name, p.created_at
FROM projekte p
WHERE
  p.organisation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.aktion = 'projekt_angelegt' AND a.entitaet_typ = 'projekt' AND a.entitaet_id = p.id
  );

-- Partner
INSERT INTO audit_log (
  organisation_id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, created_at
)
SELECT
  pa.organisation_id, NULL, NULL, 'partner_angelegt', 'partner', pa.id, pa.name, pa.created_at
FROM partner pa
WHERE
  pa.organisation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.aktion = 'partner_angelegt' AND a.entitaet_typ = 'partner' AND a.entitaet_id = pa.id
  );

-- Angebote (Tabelle existiert seit Migration 044, Backfill nur wenn Tabelle vorhanden)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'angebote') THEN
    INSERT INTO audit_log (
      organisation_id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, created_at
    )
    SELECT
      a.organisation_id, NULL, NULL, 'angebot_erstellt', 'angebot', a.id,
      COALESCE(a.titel, a.nummer), a.created_at
    FROM angebote a
    WHERE
      a.organisation_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM audit_log al
        WHERE al.aktion = 'angebot_erstellt' AND al.entitaet_typ = 'angebot' AND al.entitaet_id = a.id
      );
  END IF;
END
$$;

-- Verträge (Tabelle existiert seit Migration 043)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vertraege') THEN
    INSERT INTO audit_log (
      organisation_id, user_id, user_email, aktion, entitaet_typ, entitaet_id, entitaet_name, created_at
    )
    SELECT
      v.organisation_id, NULL, NULL, 'vertrag_erstellt', 'vertrag', v.id,
      COALESCE(v.titel, v.vertragsnummer), v.created_at
    FROM vertraege v
    WHERE
      v.organisation_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM audit_log al
        WHERE al.aktion = 'vertrag_erstellt' AND al.entitaet_typ = 'vertrag' AND al.entitaet_id = v.id
      );
  END IF;
END
$$;
