-- ============================================================
-- Migration 074 · client_nachrichten.organisation_id Backfill
--
-- portalNachrichtSenden() hat die Spalte organisation_id nicht gesetzt.
-- Admin-Queries filtern seit Mig. 068 auf organisation_id → alle vom
-- Kunden gesendeten Nachrichten ohne org_id waren für den Admin
-- unsichtbar.
--
-- Der Code-Fix stellt ab sofort sicher, dass neue Nachrichten die
-- organisation_id aus dem Projekt übernehmen. Diese Migration holt
-- das für bestehende Zeilen nach.
-- ============================================================

UPDATE client_nachrichten cn
   SET organisation_id = p.organisation_id
  FROM projekte p
 WHERE cn.projekt_id      = p.id
   AND cn.organisation_id IS NULL
   AND p.organisation_id  IS NOT NULL;
