-- Migration 018: Produkte-Sortierung initialisieren
-- produkte.reihenfolge existiert bereits; wir setzen initiale Werte
-- basierend auf created_at innerhalb jedes Raums.

UPDATE produkte
SET reihenfolge = sub.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY raum_id ORDER BY created_at) - 1 AS row_num
  FROM produkte
  WHERE deleted_at IS NULL
    AND raum_id IS NOT NULL
) sub
WHERE produkte.id = sub.id
  AND produkte.reihenfolge = 0;
