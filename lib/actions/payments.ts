'use server'

import { createClient } from '@/lib/supabase/server'
import { tokenSchema } from '@/lib/validations/inquiry'
import { generateShortToken } from '@/lib/tokens'
import type { Payment, PaymentMethod } from '@/lib/supabase/types'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function validateAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero'
  return null
}

function validateMethod(method: PaymentMethod): string | null {
  if (method !== 'cash' && method !== 'wamd') return 'Invalid payment method'
  return null
}

/**
 * `paid_at` arrives as a `YYYY-MM-DD` string from an `<input type="date">`.
 * Reject anything that isn't that shape, doesn't parse to a real calendar date,
 * or lands more than a day in the future (a slip of the finger on the year).
 */
function validatePaidAt(paidAt: string): string | null {
  if (!DATE_ONLY_RE.test(paidAt)) return 'Enter the payment date as YYYY-MM-DD'
  const parsed = new Date(`${paidAt}T00:00:00Z`)
  const ms = parsed.getTime()
  if (Number.isNaN(ms)) return 'That payment date is not valid'
  // Guard against 2026-02-31 style rollovers that Date silently normalises.
  if (parsed.toISOString().slice(0, 10) !== paidAt) return 'That payment date is not valid'
  if (ms > Date.now() + ONE_DAY_MS) return 'The payment date cannot be in the future'
  return null
}

export async function recordPayment(
  inquiryId: string,
  input: {
    amount: number
    method: PaymentMethod
    note?: string
    paid_at?: string
    orderId?: string | null
  }
): Promise<ActionResult<Payment>> {
  if (!tokenSchema.safeParse(inquiryId).success) {
    return { data: null, error: 'Invalid inquiry ID' }
  }

  const amountError = validateAmount(input.amount)
  if (amountError) return { data: null, error: amountError }

  const methodError = validateMethod(input.method)
  if (methodError) return { data: null, error: methodError }

  if (input.paid_at !== undefined) {
    const paidAtError = validatePaidAt(input.paid_at)
    if (paidAtError) return { data: null, error: paidAtError }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Resolve the order this payment belongs to. Callers that already know it pass
  // it through; otherwise look for a confirmed order on this inquiry. When there
  // is none yet, leave it null — trigger 037c on `AFTER INSERT ON orders` adopts
  // the orphan payment once the order is created.
  let orderId: string | null = input.orderId ?? null
  if (orderId === null) {
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .maybeSingle()
    orderId = order?.id ?? null
  }

  const insert: {
    inquiry_id: string
    order_id: string | null
    amount: number
    method: PaymentMethod
    note: string | null
    receipt_token: string
    paid_at?: string
  } = {
    inquiry_id: inquiryId,
    order_id: orderId,
    amount: input.amount,
    method: input.method,
    note: input.note?.trim() || null,
    receipt_token: generateShortToken(),
  }
  if (input.paid_at !== undefined) insert.paid_at = input.paid_at

  const { data, error } = await supabase
    .from('payments')
    .insert(insert)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to record payment' }
  }
  return { data: data as unknown as Payment, error: null }
}

export async function updatePayment(
  id: string,
  patch: {
    amount?: number
    method?: PaymentMethod
    note?: string | null
    paid_at?: string
  }
): Promise<ActionResult<Payment>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid payment ID' }
  }

  if (patch.amount !== undefined) {
    const amountError = validateAmount(patch.amount)
    if (amountError) return { data: null, error: amountError }
  }
  if (patch.method !== undefined) {
    const methodError = validateMethod(patch.method)
    if (methodError) return { data: null, error: methodError }
  }
  if (patch.paid_at !== undefined) {
    const paidAtError = validatePaidAt(patch.paid_at)
    if (paidAtError) return { data: null, error: paidAtError }
  }

  // Never touch receipt_token: editing a payment in place keeps the receipt link
  // already sent to the customer valid. That is the whole reason this exists
  // instead of delete + re-add.
  const update: {
    amount?: number
    method?: PaymentMethod
    note?: string | null
    paid_at?: string
  } = {}
  if (patch.amount !== undefined) update.amount = patch.amount
  if (patch.method !== undefined) update.method = patch.method
  if (patch.note !== undefined) {
    update.note = typeof patch.note === 'string' ? patch.note.trim() || null : null
  }
  if (patch.paid_at !== undefined) update.paid_at = patch.paid_at

  if (Object.keys(update).length === 0) {
    return { data: null, error: 'Nothing to update' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('payments')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to update payment' }
  }
  return { data: data as unknown as Payment, error: null }
}

export async function deletePayment(paymentId: string): Promise<ActionResult<void>> {
  if (!tokenSchema.safeParse(paymentId).success) {
    return { data: null, error: 'Invalid payment ID' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}
