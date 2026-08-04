import type { PaymentStatus } from './supabase/types'

/**
 * Client-side mirror of the STORED generated `payment_status` column added in
 * supabase/migrations/026_add_amount_paid.sql. Keep this in sync with that
 * migration's CASE expression if either one changes.
 *
 *   'paid'    when fully_paid
 *   'partial' when amount_paid is set (not null, not zero)
 *   'unpaid'  otherwise
 *
 * Note: deposit_amount (security deposit / collateral) is a separate field and does
 * NOT factor into payment status or balance calculations — see balanceOwed below.
 */
export function derivePaymentStatus(
  fully_paid: boolean,
  amount_paid: number | string | null
): PaymentStatus {
  if (fully_paid) return 'paid'
  const amount = amount_paid == null ? 0 : Number(amount_paid)
  if (amount !== 0) return 'partial'
  return 'unpaid'
}

/**
 * Remaining balance owed on an inquiry/order.
 * - Fully paid orders owe nothing.
 * - Otherwise the amount paid is credited against the price (an amount is assumed
 *   collected once an admin records it — there's no separate "paid" toggle).
 *
 * Note: deposit_amount (security deposit / collateral) is intentionally excluded from
 * this calculation — it's held as collateral, not credited toward the price.
 */
export function balanceOwed(
  price: number | string | null,
  amount_paid: number | string | null,
  fully_paid: boolean
): number {
  if (fully_paid) return 0
  const priceNum = price == null ? 0 : Number(price)
  const amountNum = amount_paid == null ? 0 : Number(amount_paid)
  return Math.max(0, priceNum - amountNum)
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
