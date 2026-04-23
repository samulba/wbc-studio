-- ============================================================
-- Migration 080 · Timeline: Freigabe-Quelle hinzufügen
--
-- Die timeline_events.quelle-CHECK-Constraint (aus Mig. 075)
-- kannte bisher: manuell, produkt, bestellstatus, deadline,
-- angebot, vertrag. Für Freigabe-Auto-Events (z.B. "Kunde hat
-- Freigabe abgeschlossen am X") erweitern wir den Allow-Set um
-- 'freigabe'.
-- ============================================================

ALTER TABLE timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_quelle_check;

ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_quelle_check
  CHECK (quelle IN ('manuell','produkt','bestellstatus','deadline','angebot','vertrag','freigabe'));

COMMENT ON COLUMN timeline_events.quelle IS
  'Quelle des Events: manuell oder auto-synchronisiert aus Produkt/Bestellstatus/Deadline/Angebot/Vertrag/Freigabe.';
