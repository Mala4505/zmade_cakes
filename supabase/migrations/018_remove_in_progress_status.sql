-- 018_remove_in_progress_status.sql
-- Owner-requested flow change: order/inquiry status lifecycle collapses from
-- Confirmed -> In Progress -> Ready -> Dispatched to Confirmed -> Ready -> Dispatched.
-- "Dispatched" is a UI-only label for the existing 'delivered' DB value (see lib/format.ts) —
-- no DB value changes for that state. 'in_progress' is removed entirely.
--
-- Note on constraint inspection: as with 015_unified_payment_model.sql, this migration was
-- authored without a live DB connection available in this environment, so
-- `SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass` /
-- `'inquiries'::regclass` could not be run interactively. Per 002_create_inquiries.sql and
-- 003_create_orders.sql, both status columns use an inline `CHECK (status IN (...))` defined
-- immediately after the column, which Postgres auto-names `<table>_status_check`. The DO
-- blocks below locate and drop the real constraint dynamically (matching on the constraint
-- definition text rather than a guessed name) so this migration is correct even if the live
-- name has drifted from that convention.

-- 1. Data updates BEFORE constraint changes: migrate any rows currently sitting in
--    'in_progress' to 'confirmed' so the tightened CHECK constraints below don't reject them.
UPDATE orders SET status = 'confirmed' WHERE status = 'in_progress';
UPDATE inquiries SET status = 'confirmed' WHERE status = 'in_progress';

-- 2. Tighten orders.status CHECK to drop 'in_progress'.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%in_progress%'
  LOOP
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('confirmed', 'ready', 'delivered', 'cancelled'));

-- 3. Tighten inquiries.status CHECK to drop 'in_progress'.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'inquiries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%in_progress%'
  LOOP
    EXECUTE format('ALTER TABLE inquiries DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
  CHECK (status IN (
    'pending', 'awaiting_confirmation', 'confirmed', 'ready', 'delivered', 'cancelled'
  ));

-- 4. Rebuild sync_order_status so its status-mirror list drops 'in_progress' and becomes
--    ready/delivered/cancelled.
--
--    IMPORTANT: this function's original body is not checked into any migration file (it was
--    created directly against the live DB — see lib/actions/orders.ts for its only call sites:
--    `supabase.rpc('sync_order_status', { p_order_id, p_new_status })`, and
--    lib/supabase/types.ts for its recorded signature: (p_order_id uuid, p_new_status text)
--    returns void). No live DB/Docker connection was available in this environment to pull the
--    exact existing definition, so the body below is a reconstruction based on the call sites
--    and this table's schema: it updates the order's status, and — for the subset of statuses
--    that also exist on inquiries.status ('ready', 'delivered', 'cancelled', i.e. the
--    "mirror list" minus 'in_progress' per this migration's brief) — mirrors that status onto
--    the linked inquiry. 'confirmed' is intentionally excluded from the mirror list because
--    inquiries.status is already set to 'confirmed' directly in confirmInquiry()
--    (lib/actions/inquiries.ts) at order-creation time, before this RPC is ever called.
--    CREATE OR REPLACE preserves the existing signature, so this is safe to apply even if the
--    live body differs slightly — verify against the live function before relying on exact
--    prior behavior beyond the in_progress removal called for here.
CREATE OR REPLACE FUNCTION sync_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_inquiry_id UUID;
BEGIN
  UPDATE orders
  SET status = p_new_status
  WHERE id = p_order_id
  RETURNING inquiry_id INTO v_inquiry_id;

  IF v_inquiry_id IS NOT NULL AND p_new_status IN ('ready', 'delivered', 'cancelled') THEN
    UPDATE inquiries
    SET status = p_new_status
    WHERE id = v_inquiry_id;
  END IF;
END;
$$;
