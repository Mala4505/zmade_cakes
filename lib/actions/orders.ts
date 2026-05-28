'use server'

import { createClient } from '@/lib/supabase/server'
import { tokenSchema } from '@/lib/validations/inquiry'
import type { Order, OrderStatus } from '@/lib/supabase/types'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

// Order status maps 1:1 to inquiry status for the overlapping states
const INQUIRY_STATUS_SYNC: Partial<Record<OrderStatus, string>> = {
  in_progress: 'in_progress',
  ready: 'ready',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<ActionResult<Order>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid order ID' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('status, inquiry_id')
    .eq('id', id)
    .single()

  if (fetchError || !current) return { data: null, error: 'Order not found' }

  const allowed = VALID_TRANSITIONS[current.status as OrderStatus]
  if (!allowed.includes(status)) {
    return { data: null, error: `Cannot move from "${current.status}" to "${status}"` }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Failed to update order' }

  // Keep inquiry status in sync
  const inquiryStatus = INQUIRY_STATUS_SYNC[status]
  if (inquiryStatus) {
    await supabase.from('inquiries').update({ status: inquiryStatus }).eq('id', current.inquiry_id)
  }

  if (status === 'ready' || status === 'delivered') {
    await supabase.from('notifications').insert({
      type: 'order_update',
      title: status === 'ready' ? 'Order Ready for Pickup' : 'Order Delivered',
      body:
        status === 'ready'
          ? `Order for ${data.inquiry_id.slice(0, 8)} is ready!`
          : `Order for ${data.inquiry_id.slice(0, 8)} has been delivered`,
      inquiry_id: current.inquiry_id,
      order_id: id,
      is_read: false,
    })
  }

  return { data: data as unknown as Order, error: null }
}

export async function cancelOrder(id: string): Promise<ActionResult<void>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid order ID' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('status, inquiry_id')
    .eq('id', id)
    .single()

  if (fetchError || !order) return { data: null, error: 'Order not found' }
  if (order.status === 'delivered') return { data: null, error: 'Cannot cancel a delivered order' }
  if (order.status === 'cancelled') return { data: null, error: 'Order is already cancelled' }

  const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
  if (error) return { data: null, error: error.message }

  await supabase.from('inquiries').update({ status: 'cancelled' }).eq('id', order.inquiry_id)

  return { data: undefined, error: null }
}

export async function updateOrderEta(
  id: string,
  eta: { eta_date: string | null; eta_time: string | null; eta_note: string }
): Promise<ActionResult<Order>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid order ID' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('orders')
    .update({
      eta_date: eta.eta_date || null,
      eta_time: eta.eta_time || null,
      eta_note: eta.eta_note,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Failed to update ETA' }
  return { data: data as unknown as Order, error: null }
}
