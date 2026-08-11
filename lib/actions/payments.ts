'use server'

import { createClient } from '@/lib/supabase/server'
import { tokenSchema } from '@/lib/validations/inquiry'
import { generateShortToken } from '@/lib/tokens'
import type { Payment, PaymentMethod } from '@/lib/supabase/types'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function recordPayment(
  orderId: string,
  input: { amount: number; method: PaymentMethod; note?: string }
): Promise<ActionResult<Payment>> {
  if (!tokenSchema.safeParse(orderId).success) {
    return { data: null, error: 'Invalid order ID' }
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { data: null, error: 'Amount must be greater than zero' }
  }
  if (input.method !== 'cash' && input.method !== 'wamd') {
    return { data: null, error: 'Invalid payment method' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      amount: input.amount,
      method: input.method,
      note: input.note || null,
      receipt_token: generateShortToken(),
    })
    .select()
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Failed to record payment' }
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
