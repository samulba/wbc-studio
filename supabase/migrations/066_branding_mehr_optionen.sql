-- ============================================================
-- Migration 066 · Branding-Optionen ausbauen
-- ============================================================
-- Neue Felder für richtig geiles White-Label-Feeling im Kunden-Portal:
--   support_email          sichtbarer Support-Kontakt (z.B. hello@studio.com)
--   footer_text            frei editierbarer Text im Portal-Footer
--   hero_image_url         optionales Hintergrundbild für Login/Dashboard-Hero
--   accent_gradient_from   Startfarbe für Hero-Gradient (optional)
--   accent_gradient_to     Endfarbe für Hero-Gradient (optional)
--   corner_style           Layout-Preset: 'soft' | 'rounded' | 'sharp'
--   social_instagram       Instagram-Handle/URL
--   social_website         externe Homepage

ALTER TABLE branding
  ADD COLUMN IF NOT EXISTS support_email        text,
  ADD COLUMN IF NOT EXISTS footer_text          text,
  ADD COLUMN IF NOT EXISTS hero_image_url       text,
  ADD COLUMN IF NOT EXISTS accent_gradient_from text,
  ADD COLUMN IF NOT EXISTS accent_gradient_to   text,
  ADD COLUMN IF NOT EXISTS corner_style         text NOT NULL DEFAULT 'soft'
    CHECK (corner_style IN ('soft', 'rounded', 'sharp')),
  ADD COLUMN IF NOT EXISTS social_instagram     text,
  ADD COLUMN IF NOT EXISTS social_website       text;

COMMENT ON COLUMN branding.support_email       IS 'Sichtbarer Support-Kontakt im Portal-Footer';
COMMENT ON COLUMN branding.footer_text         IS 'Frei formulierter Text im Portal-Footer (kurz halten)';
COMMENT ON COLUMN branding.hero_image_url      IS 'Optionales Hintergrundbild für Login + Dashboard-Hero';
COMMENT ON COLUMN branding.accent_gradient_from IS 'Hex-Farbe Start für Hero-Gradient; wenn leer: nur primary_color';
COMMENT ON COLUMN branding.accent_gradient_to   IS 'Hex-Farbe Ende für Hero-Gradient; beide Felder müssen gesetzt sein';
COMMENT ON COLUMN branding.corner_style        IS 'Layout-Ecken-Preset: soft (default) | rounded | sharp';
