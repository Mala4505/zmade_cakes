import type { PaymentStatus } from './supabase/types'

/**
 * Client-side mirror of the STORED generated `payment_status` column, as
 * recomputed in supabase/migrations/037_payment_ledger_truth.sql. Keep this in
 * sync with that migration's CASE expression if either one changes.
 *
 * Payment status is DERIVED from money — the amount paid (summed from the
 * `payments` ledger into `amount_paid`) measured against the order total:
 *
 *   'paid'    when settled manually, OR amount paid covers the order total
 *   'partial' when some money is in but it doesn't cover the total
 *   'unpaid'  when no money is in
 *
 * `settled` (the `inquiries.fully_paid` column) no longer means "is paid". It is
 * a manual override for a remainder that was comped or written off to rounding —
 * it forces 'paid' regardless of the money.
 *
 * Note: deposit_amount (security deposit / collateral) is a separate field and does
 * NOT factor into payment status or balance calculations — see balanceOwed below.
 */
export function derivePaymentStatus(
  amountPaid: number | string | null,
  orderTotal: number | string | null,
  settled = false
): PaymentStatus {
  if (settled) return 'paid'
  const paid = Number(amountPaid ?? 0), total = Number(orderTotal ?? 0)
  if (total > 0 && paid >= total - 0.0005) return 'paid'   // KWD has 3 dp; half-fils epsilon
  return paid > 0 ? 'partial' : 'unpaid'
}

/**
 * Remaining balance owed on an inquiry/order: the order total minus the amount
 * paid (summed from the `payments` ledger), floored at zero.
 *
 * `settled` (the `inquiries.fully_paid` column) is the manual override — a comped
 * remainder or rounding write-off — and forces the balance to zero regardless of
 * the money actually collected.
 *
 * Note: deposit_amount (security deposit / collateral) is intentionally excluded from
 * this calculation — it's held as collateral, not credited toward the price.
 */
export function balanceOwed(
  price: number | string | null,
  amountPaid: number | string | null,
  settled = false
): number {
  if (settled) return 0
  return Math.max(0, Number(price ?? 0) - Number(amountPaid ?? 0))
}

/**
 * Price minus the admin-applied discount, plus the delivery charge (0 on pickup orders).
 * Used as the order's final_price at confirmation time.
 */
export function orderTotal(
  admin_price: number | string | null,
  discount: number | string | null,
  delivery_charge: number | string | null = 0
): number {
  return Math.max(0, Number(admin_price ?? 0) - Number(discount ?? 0)) + Number(delivery_charge ?? 0)
}
