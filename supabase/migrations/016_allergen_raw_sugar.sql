-- 016_allergen_raw_sugar.sql
-- Owner-requested dietary flag change: drop Halal + Gluten-free from the UI/validation set,
-- add Raw sugar. The halal/gluten-free columns themselves are left in place in the DB — only
-- the UI-facing "has allergens" index changes. (allergen_gluten_free / allergen_halal remain
-- untouched columns; see lib/supabase/types.ts for the corresponding app-facing type change.)

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS allergen_raw_sugar BOOLEAN NOT NULL DEFAULT false;

-- Rebuild idx_inquiries_has_allergens (previously defined in
-- 006_allergens_and_balance.sql as:
--   ON inquiries((allergen_nut_free OR allergen_gluten_free OR allergen_dairy_free OR allergen_egg_free OR allergen_halal))
-- ) to drop halal/gluten-free from the expression and include raw_sugar instead.
DROP INDEX IF EXISTS idx_inquiries_has_allergens;

CREATE INDEX idx_inquiries_has_allergens
  ON inquiries((
    allergen_nut_free OR allergen_dairy_free OR allergen_egg_free OR allergen_raw_sugar
  ));
