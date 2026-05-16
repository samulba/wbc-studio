-- ============================================================
-- Migration 045 · 2D Raumplaner
-- ============================================================

-- ── 1. Neue Spalten auf raeume ────────────────────────────────

ALTER TABLE raeume
  ADD COLUMN IF NOT EXISTS grundriss_json  JSONB,
  ADD COLUMN IF NOT EXISTS breite_m        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS laenge_m        NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS hoehe_m         NUMERIC(6,2) DEFAULT 2.50;


-- ── 2. Tabelle moebel_symbole ─────────────────────────────────

CREATE TABLE IF NOT EXISTS moebel_symbole (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        REFERENCES organisationen(id) ON DELETE CASCADE,
  -- NULL = System-Symbol (für alle Orgs verfügbar)
  name             TEXT        NOT NULL,
  kategorie_id     UUID        REFERENCES kategorien(id) ON DELETE SET NULL,
  svg_path         TEXT        NOT NULL,
  breite_cm        NUMERIC(6,1) NOT NULL,
  tiefe_cm         NUMERIC(6,1) NOT NULL,
  farbe            TEXT        DEFAULT '#94c1a4',
  ist_system       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moebel_symbole_org ON moebel_symbole(organisation_id);
CREATE INDEX IF NOT EXISTS idx_moebel_symbole_system ON moebel_symbole(ist_system);


-- ── 3. RLS ────────────────────────────────────────────────────

ALTER TABLE moebel_symbole ENABLE ROW LEVEL SECURITY;

-- Lesen: System-Symbole für alle, eigene Org-Symbole
CREATE POLICY "moebel_symbole_select" ON moebel_symbole
  FOR SELECT TO authenticated
  USING (ist_system = true OR organisation_id = get_user_org_id());

-- Schreiben: Nur eigene Org-Symbole (kein ist_system)
CREATE POLICY "moebel_symbole_insert" ON moebel_symbole
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id() AND ist_system = false);

CREATE POLICY "moebel_symbole_update" ON moebel_symbole
  FOR UPDATE TO authenticated
  USING (organisation_id = get_user_org_id() AND ist_system = false);

CREATE POLICY "moebel_symbole_delete" ON moebel_symbole
  FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id() AND ist_system = false);


-- ── 4. Seed: Standard Möbelsymbole (SVG Draufsicht, 100×100 Einheiten) ──

-- Wohnzimmer
INSERT INTO moebel_symbole (name, svg_path, breite_cm, tiefe_cm, farbe, ist_system) VALUES
(
  'Sofa 3-Sitzer',
  'M2,5 H98 V95 H2 Z M2,72 H98 V95 H2 Z M2,5 H14 V72 H2 Z M86,5 H98 V72 H86 Z',
  200, 90, '#b8cfc7', true
),
(
  'Sessel',
  'M5,20 H95 V95 H5 Z M5,5 H95 V20 H5 Z M5,20 H18 V95 H5 Z M82,20 H95 V95 H82 Z',
  80, 80, '#b8cfc7', true
),
(
  'Couchtisch',
  'M10,10 H90 V90 H10 Z M15,15 H85 V85 H15 Z',
  120, 60, '#d4b896', true
),

-- Esszimmer
(
  'Esstisch',
  'M5,5 H95 V95 H5 Z M12,12 H88 V88 H12 Z',
  160, 90, '#d4b896', true
),
(
  'Stuhl',
  'M8,28 H92 V95 H8 Z M8,5 H92 V28 H8 Z',
  45, 45, '#b8cfc7', true
),
(
  'Barhocker',
  'M20,5 H80 L95,20 V80 L80,95 H20 L5,80 V20 Z',
  40, 40, '#b8cfc7', true
),

-- Schlafzimmer
(
  'Doppelbett',
  'M2,2 H98 V98 H2 Z M2,2 H98 V18 H2 Z M5,22 H47 V93 H5 Z M53,22 H95 V93 H53 Z',
  200, 180, '#c8d8e8', true
),
(
  'Einzelbett',
  'M2,2 H98 V98 H2 Z M2,2 H98 V18 H2 Z M10,22 H90 V93 H10 Z',
  200, 100, '#c8d8e8', true
),
(
  'Nachttisch',
  'M5,5 H95 V95 H5 Z M5,50 H95 M40,50 H60 V95',
  45, 40, '#d4b896', true
),
(
  'Kleiderschrank',
  'M2,2 H98 V98 H2 Z M50,2 V98 M22,48 H38 M62,48 H78',
  200, 60, '#c8c8c8', true
),
(
  'Regal',
  'M2,2 H98 V98 H2 Z M2,35 H98 M2,65 H98',
  120, 35, '#d4b896', true
),
(
  'Sideboard',
  'M2,5 H98 V95 H2 Z M34,5 V95 M66,5 V95 M20,48 H30 M50,48 H60 M70,48 H82',
  160, 45, '#d4b896', true
),
(
  'Schreibtisch',
  'M2,2 H98 V98 H2 Z M2,75 H98 V98 H2 Z M75,2 H98 V75 H75 Z',
  140, 70, '#d4b896', true
),

-- Bad
(
  'Badewanne',
  'M5,5 H95 V95 H5 Z M12,12 H85 A3,3,0,0,1,88,15 V88 H12 Z',
  180, 80, '#aed4e8', true
),
(
  'Waschbecken',
  'M5,5 H95 V95 H5 Z M20,18 H80 V82 H20 Z M50,10 V18 M48,18 H52',
  60, 45, '#aed4e8', true
),
(
  'Toilette',
  'M28,2 H72 V32 H28 Z M8,32 H92 V96 H8 Z M50,55 A18,18,0,1,0,50.01,55 Z',
  40, 55, '#aed4e8', true
),
(
  'Dusche',
  'M2,2 H98 V98 H2 Z M88,2 A14,14,0,0,1,98,12 M35,35 H65 V65 H35 Z',
  90, 90, '#aed4e8', true
),

-- Küche
(
  'Küchenzeile',
  'M2,2 H98 V98 H2 Z M2,28 H98 M25,28 V98 M50,28 V98 M75,28 V98',
  300, 60, '#e0e0e0', true
),
(
  'Herd',
  'M5,5 H95 V95 H5 Z M22,22 A12,12,0,1,0,22.01,22 M78,22 A12,12,0,1,0,78.01,22 M22,78 A12,12,0,1,0,22.01,78 M78,78 A12,12,0,1,0,78.01,78 M50,50 A6,6,0,1,0,50.01,50',
  60, 60, '#e0e0e0', true
);
