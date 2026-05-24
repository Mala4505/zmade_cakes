ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS allergen_nut_free     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_gluten_free  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_dairy_free   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_egg_free     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_halal        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allergen_other        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS balance_paid          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_paid_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inquiries_has_allergens
  ON inquiries((allergen_nut_free OR allergen_gluten_free OR allergen_dairy_free OR allergen_egg_free OR allergen_halal));
