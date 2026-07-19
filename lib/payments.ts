import type { PaymentStatus } from './supabase/types'

/**
 * Client-side mirror of the STORED generated `payment_status` column added in
 * supabase/migrations/015_unified_payment_model.sql. Keep this in sync with that migration's
 * CASE expression if either one changes.
 *
 *   'paid'    when fully_paid
 *   'partial' when advance_paid AND advance_amount is set (not null, not zero)
 *   'unpaid'  otherwise
 */
export function derivePaymentStatus(
  fully_paid: boolean,
  advance_paid: boolean,
  advance_amount: number | string | null
): PaymentStatus {
  if (fully_paid) return 'paid'
  const amount = advance_amount == null ? 0 : Number(advance_amount)
  if (advance_paid && amount !== 0) return 'partial'
  return 'unpaid'
}

/**
 * Remaining balance owed on an inquiry/order.
 * - Fully paid orders owe nothing.
 * - Otherwise, only the portion of the advance that has actually been paid is credited
 *   against the price (an advance_amount that's been set but not yet paid doesn't reduce
 *   what's owed).
 */
export function balanceOwed(
  price: number | string | null,
  advance_amount: number | string | null,
  advance_paid: boolean,
  fully_paid: boolean
): number {
  if (fully_paid) return 0
  const priceNum = price == null ? 0 : Number(price)
  const advanceNum = advance_paid && advance_amount != null ? Number(advance_amount) : 0
  return Math.max(0, priceNum - advanceNum)
}
