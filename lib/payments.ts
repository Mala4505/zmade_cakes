import type { PaymentStatus } from './supabase/types'

/**
 * Client-side mirror of the STORED generated `payment_status` column added in
 * supabase/migrations/025_remove_advance_payment.sql. Keep this in sync with that
 * migration's CASE expression if either one changes.
 *
 *   'paid'    when fully_paid
 *   'partial' when deposit_amount is set (not null, not zero)
 *   'unpaid'  otherwise
 */
export function derivePaymentStatus(
  fully_paid: boolean,
  deposit_amount: number | string | null
): PaymentStatus {
  if (fully_paid) return 'paid'
  const amount = deposit_amount == null ? 0 : Number(deposit_amount)
  if (amount !== 0) return 'partial'
  return 'unpaid'
}

/**
 * Remaining balance owed on an inquiry/order.
 * - Fully paid orders owe nothing.
 * - Otherwise the deposit amount is credited against the price (a deposit is assumed
 *   collected once an admin records it — there's no separate "paid" toggle).
 */
export function balanceOwed(
  price: number | string | null,
  deposit_amount: number | string | null,
  fully_paid: boolean
): number {
  if (fully_paid) return 0
  const priceNum = price == null ? 0 : Number(price)
  const depositNum = deposit_amount == null ? 0 : Number(deposit_amount)
  return Math.max(0, priceNum - depositNum)
}

/**
 * Price after the admin-applied discount is subtracted. Used as the order's
 * final_price at confirmation time.
 */
export function subtotalAfterDiscount(
  admin_price: number | string | null,
  discount: number | string | null
): number {
  return Math.max(0, Number(admin_price ?? 0) - Number(discount ?? 0))
}
