-- 017_cake_details_consolidation.sql
-- The standalone "Decoration style" dropdown is removed from the UI entirely; its concept
-- folds into a single consolidated "Cake Details" textarea, which is just the existing
-- special_requirements column relabeled. decoration_style is left in the schema (full column
-- drop deferred to a future owner-approved cleanup migration) but is emptied out after its
-- existing values are folded into special_requirements, and gets a default so future inserts
-- don't need to supply it.

-- 1. Give decoration_style a default so it can be omitted on insert going forward.
ALTER TABLE inquiries ALTER COLUMN decoration_style SET DEFAULT '';

-- 2. Fold existing non-empty decoration_style values into special_requirements for existing
--    rows (data update BEFORE decoration_style is blanked out below).
UPDATE inquiries
SET special_requirements = 'Decoration: ' || decoration_style || E'\n' || special_requirements
WHERE decoration_style IS NOT NULL AND decoration_style <> '';

-- 3. Blank out decoration_style for all rows now that its content lives in
--    special_requirements. Column stays in the schema, just empty.
UPDATE inquiries SET decoration_style = '' WHERE decoration_style <> '';
