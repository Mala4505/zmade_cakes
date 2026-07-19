-- 015_unified_payment_model.sql
-- Collapses the old free-text "payment status" select + "Balance paid" checkbox into a single
-- computed model: Unpaid / Deposit paid / Fully paid, derived from fully_paid (bool) +
-- advance_paid (bool) + advance_amount (numeric).
--
-- ⚠️ IMPORTANT: after this migration, `payment_status` is a STORED GENERATED COLUMN.
-- No code path may INSERT or UPDATE payment_status or balance_paid — Postgres will reject
-- writes to payment_status outright, and balance_paid no longer exists (renamed to
-- fully_paid). The generated expression below must be kept in sync with
-- lib/payments.ts#derivePaymentStatus.
--
-- Note on constraint inspection: this migration was authored without a live DB connection
-- available (no local Supabase/Docker instance in this environment), so the
-- `SELECT conname FROM pg_constraint WHERE conrelid = 'inquiries'::regclass` /
-- `'orders'::regclass` inspection called for in the task could not be run interactively.
-- Based on supabase/migrations/002_create_inquiries.sql and 003_create_orders.sql, neither
-- `payment_status` nor `balance_paid` is referenced by any CHECK constraint (they are plain,
-- unconstrained columns), so no constraint drop/recreate is expected to be needed for this
-- migration. The DO block below is a defensive, name-agnostic safety net: it drops any CHECK
-- constraint on inquiries that happens to reference balance_paid, in case the live schema has
-- drifted from what's recorded in migration history.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'inquiries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%balance_paid%'
  LOOP
    EXECUTE format('ALTER TABLE inquiries DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 1. Rename balance_paid -> fully_paid. Values carry over unchanged; this becomes the single
--    source of truth for "fully paid" (no more separate manual payment-status select).
ALTER TABLE inquiries RENAME COLUMN balance_paid TO fully_paid;

-- 2. Reconcile legacy payment_status free-text values into the new boolean model BEFORE the
--    column is dropped and rebuilt as generated (data updates must land before the schema
--    change that would make them impossible).
UPDATE inquiries SET fully_paid = true WHERE payment_status = 'paid' AND fully_paid = false;
UPDATE inquiries SET advance_paid = true WHERE payment_status = 'partial' AND advance_paid = false;

-- 3. Drop the old freeform payment_status column and the dead balance_paid_at column
--    (superseded by fully_paid; no code path reads balance_paid_at).
ALTER TABLE inquiries DROP COLUMN IF EXISTS payment_status;
ALTER TABLE inquiries DROP COLUMN IF EXISTS balance_paid_at;

-- 4. Re-add payment_status as an always-consistent STORED generated column. Semantics:
--      'paid'    when fully_paid
--      'partial' when advance_paid AND advance_amount is set (not null, not zero)
--      'unpaid'  otherwise
--    advance_amount has a CHECK (advance_amount > 0) constraint (see 002_create_inquiries.sql),
--    so in practice a non-null value is always > 0 — the `<> 0` check below is kept as a
--    defensive belt-and-braces guard.
ALTER TABLE inquiries ADD COLUMN payment_status TEXT GENERATED ALWAYS AS (
  CASE
    WHEN fully_paid THEN 'paid'
    WHEN advance_paid AND advance_amount IS NOT NULL AND advance_amount <> 0 THEN 'partial'
    ELSE 'unpaid'
  END
) STORED;
