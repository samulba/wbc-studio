-- ============================================================
-- Migration 073 · Alte Kategorie-Seed-Werte aufräumen
--
-- Die Original-Seeds aus Mig. 019 haben semantisch falsch platzierte
-- Einträge hinterlassen. Diese Migration löscht nur exakte Namens-
-- treffer der Alt-Seed-Liste — nichts, was der User selbst angelegt
-- oder umbenannt hat.
--
-- ON DELETE SET NULL auf den FK-Spalten (produkte.kategorie_id,
-- raeume.raumtyp_id, projekte.projektart_id) sorgt dafür, dass
-- verknüpfte Datensätze erhalten bleiben — nur die Zuordnung
-- verschwindet. User kann sie anschließend neu setzen.
-- ============================================================

-- Falsche Raumtyp-Einträge entfernen (sind in Wirklichkeit Projektarten)
DELETE FROM kategorien
 WHERE typ = 'raumtyp'
   AND name IN ('Studio', 'Wellness', 'Hotel', 'Privat', 'Wohnung', 'Sonstiges');

-- Falsche Projektart-Einträge entfernen (sind Projekt-Phasen/Leistungen,
-- keine Kundentypen)
DELETE FROM kategorien
 WHERE typ = 'projektart'
   AND name IN ('Neubau', 'Renovation', 'Konzept', 'Beratung', 'Sonstiges', 'Umbau');
