'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  inquirySchema,
  inquiryUpdateSchema,
  deliveryAddressSchema,
  tokenSchema,
} from '@/lib/validations/inquiry'
import { customerConfirmSchema } from '@/lib/validations/confirm'
import type { Inquiry, Order, InquiryStatus } from '@/lib/supabase/types'

type FieldErrors = Record<string, string[]>
type ActionResult<T> =
  | { data: T; error: null; fieldErrors: null }
  | { data: null; error: string; fieldErrors: null }
  | { data: null; error: null; fieldErrors: FieldErrors }

export async function createInquiry(
  rawInquiry: unknown,
  rawAddress?: unknown
): Promise<ActionResult<Inquiry>> {
  const parsed = inquirySchema.safeParse(rawInquiry)
  if (!parsed.success) {
    return { data: null, error: null, fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  // cake_type is a UI-only convenience field (not a DB column) — strip before insert.
  const { cake_type: _cakeType, ...inquiryData } = parsed.data

  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({ ...inquiryData, status: 'pending' as const })
    .select()
    .single()

  if (inquiryError || !inquiry) {
    return { data: null, error: inquiryError?.message ?? 'Failed to create inquiry', fieldErrors: null }
  }

  if (parsed.data.delivery_type === 'delivery' && rawAddress) {
    const parsedAddress = deliveryAddressSchema.safeParse(rawAddress)
    if (parsedAddress.success) {
      await supabase.from('delivery_addresses').insert({
        inquiry_id: inquiry.id,
        ...parsedAddress.data,
      })
    }
  }

  await supabase.from('notifications').insert({
    type: 'inquiry_created',
    title: 'New Inquiry Created',
    body: `${inquiry.customer_name} — ${inquiry.cake_size} ${inquiry.flavor} for ${inquiry.event_date}`,
    inquiry_id: inquiry.id,
    order_id: null,
    is_read: false,
  })

  return { data: inquiry as unknown as Inquiry, error: null, fieldErrors: null }
}

export async function updateInquiry(
  id: string,
  rawData: unknown,
  rawAddress?: unknown
): Promise<ActionResult<Inquiry>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid inquiry ID', fieldErrors: null }
  }

  const parsed = inquiryUpdateSchema.safeParse(rawData)
  if (!parsed.success) {
    return { data: null, error: null, fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  // cake_type is a UI-only convenience field (not a DB column) — strip before update.
  const { cake_type: _cakeType, ...updateData } = parsed.data

  const { data, error } = await supabase
    .from('inquiries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to update inquiry', fieldErrors: null }
  }

  if (data.delivery_type === 'delivery' && rawAddress) {
    const parsedAddress = deliveryAddressSchema.safeParse(rawAddress)
    if (parsedAddress.success) {
      await supabase
        .from('delivery_addresses')
        .upsert({ inquiry_id: id, ...parsedAddress.data }, { onConflict: 'inquiry_id' })
    }
  } else if (parsed.data.delivery_type === 'pickup') {
    await supabase.from('delivery_addresses').delete().eq('inquiry_id', id)
  }

  return { data: data as unknown as Inquiry, error: null, fieldErrors: null }
}

export async function cancelInquiry(id: string): Promise<ActionResult<void>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid inquiry ID', fieldErrors: null }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .not('status', 'eq', 'cancelled')

  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: undefined, error: null, fieldErrors: null }
}

// Admin marks inquiry as awaiting confirmation — returns the confirmation token to copy
export async function sendConfirmationLink(
  id: string
): Promise<ActionResult<{ confirmation_token: string }>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid inquiry ID', fieldErrors: null }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { data, error } = await supabase
    .from('inquiries')
    .update({ status: 'awaiting_confirmation', confirmation_sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('confirmation_token')
    .single()

  if (error || !data) {
    return { data: null, error: 'Inquiry not found or already sent to customer', fieldErrors: null }
  }

  return { data: { confirmation_token: data.confirmation_token }, error: null, fieldErrors: null }
}

// Called from the public API route handler — uses service role to bypass RLS.
// Token validated in code before any DB operation.
export async function confirmInquiry(
  token: string,
  rawData: unknown
): Promise<ActionResult<{ inquiry: Inquiry; order?: Order }>> {
  if (!tokenSchema.safeParse(token).success) {
    return { data: null, error: 'Invalid token', fieldErrors: null }
  }

  const parsed = customerConfirmSchema.safeParse(rawData)
  if (!parsed.success) {
    return { data: null, error: null, fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors }
  }

  const supabase = createServiceClient()

  const { data: inquiry, error: fetchError } = await supabase
    .from('inquiries')
    .select()
    .eq('confirmation_token', token)
    .single()

  if (fetchError || !inquiry) {
    return { data: null, error: 'Inquiry not found', fieldErrors: null }
  }

  if (inquiry.confirmation_sent_at) {
    const ageMs = Date.now() - new Date(inquiry.confirmation_sent_at).getTime()
    if (ageMs > 72 * 60 * 60 * 1000) {
      return { data: null, error: 'This confirmation link has expired. Please contact Zainab for a new one.', fieldErrors: null }
    }
  }

  if (inquiry.status === 'cancelled') {
    return { data: null, error: 'This inquiry has been cancelled', fieldErrors: null }
  }

  if (inquiry.customer_confirmed) {
    return { data: null, error: 'This inquiry has already been confirmed', fieldErrors: null }
  }

  const { pickup_time, message_on_cake, special_requirements, customer_comments, delivery_address, action } =
    parsed.data

  const customerEdits = { pickup_time, message_on_cake, special_requirements, customer_comments }

  if (action === 'confirm') {
    if (!inquiry.admin_price) {
      return {
        data: null,
        error: 'Price not yet set — please wait for Zainab to finalize your order details',
        fieldErrors: null,
      }
    }

    const { data: updatedInquiry, error: updateError } = await supabase
      .from('inquiries')
      .update({
        ...customerEdits,
        status: 'confirmed',
        customer_confirmed: true,
        customer_confirmed_at: new Date().toISOString(),
      })
      .eq('confirmation_token', token)
      .select()
      .single()

    if (updateError || !updatedInquiry) {
      return { data: null, error: updateError?.message ?? 'Failed to confirm order', fieldErrors: null }
    }

    if (inquiry.delivery_type === 'delivery' && delivery_address) {
      await supabase
        .from('delivery_addresses')
        .upsert({ inquiry_id: inquiry.id, ...delivery_address }, { onConflict: 'inquiry_id' })
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        inquiry_id: inquiry.id,
        status: 'confirmed',
        final_price: inquiry.admin_price!,
        delivery_type: inquiry.delivery_type,
      })
      .select()
      .single()

    if (orderError || !order) {
      return { data: null, error: orderError?.message ?? 'Failed to create order', fieldErrors: null }
    }

    await supabase.from('notifications').insert({
      type: 'customer_confirmed',
      title: 'Customer Confirmed Order',
      body: `${inquiry.customer_name} confirmed — ${inquiry.cake_size} ${inquiry.flavor}`,
      inquiry_id: inquiry.id,
      order_id: order.id,
      is_read: false,
    })

    return { data: { inquiry: updatedInquiry as unknown as Inquiry, order: order as unknown as Order }, error: null, fieldErrors: null }
  } else {
    // action === 'request_changes'
    const { data: updatedInquiry, error: updateError } = await supabase
      .from('inquiries')
      .update({ ...customerEdits, status: 'pending' })
      .eq('confirmation_token', token)
      .select()
      .single()

    if (updateError || !updatedInquiry) {
      return { data: null, error: updateError?.message ?? 'Failed to save changes', fieldErrors: null }
    }

    await supabase.from('notifications').insert({
      type: 'general',
      title: 'Customer Requested Changes',
      body: `${inquiry.customer_name} requested changes — review their comments`,
      inquiry_id: inquiry.id,
      order_id: null,
      is_read: false,
    })

    return { data: { inquiry: updatedInquiry as unknown as Inquiry }, error: null, fieldErrors: null }
  }
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus
): Promise<ActionResult<void>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid inquiry ID', fieldErrors: null }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  // Orders are the source of truth from 'confirmed' onward — sync_order_status mirrors
  // ready/delivered/cancelled back onto the inquiry. Without this, admins progressing an
  // inquiry through the status dropdown/next-step button (rather than the customer
  // confirmation link) would set inquiries.status with no matching orders row, making the
  // order invisible everywhere that reads from `orders` (e.g. the calendar).
  const { data: existingOrder, error: orderLookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('inquiry_id', id)
    .maybeSingle()
  if (orderLookupError) return { data: null, error: orderLookupError.message, fieldErrors: null }

  if (existingOrder && (status === 'ready' || status === 'delivered' || status === 'cancelled')) {
    const { error } = await supabase.rpc('sync_order_status', {
      p_order_id: existingOrder.id,
      p_new_status: status,
    })
    if (error) return { data: null, error: error.message, fieldErrors: null }
    return { data: undefined, error: null, fieldErrors: null }
  }

  if (!existingOrder && status === 'confirmed') {
    const { data: inquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('admin_price, delivery_type')
      .eq('id', id)
      .single()
    if (fetchError || !inquiry) return { data: null, error: fetchError?.message ?? 'Inquiry not found', fieldErrors: null }
    if (!inquiry.admin_price) {
      return { data: null, error: 'Set a price before confirming this order', fieldErrors: null }
    }

    const { error: orderError } = await supabase.from('orders').insert({
      inquiry_id: id,
      status: 'confirmed',
      final_price: inquiry.admin_price,
      delivery_type: inquiry.delivery_type,
    })
    if (orderError) return { data: null, error: orderError.message, fieldErrors: null }
  }

  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)
  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: undefined, error: null, fieldErrors: null }
}
