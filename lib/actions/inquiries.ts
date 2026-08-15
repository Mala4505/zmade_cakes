'use server'

import { after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  inquirySchema,
  inquiryUpdateSchema,
  deliveryAddressSchema,
  tokenSchema,
} from '@/lib/validations/inquiry'
import { customerConfirmSchema } from '@/lib/validations/confirm'
import { orderTotal } from '@/lib/payments'
import { orderSummary, buildCustomerEditDiff, type CustomerEditDiffEntry } from '@/lib/format'
import { generateShortToken } from '@/lib/tokens'
import { sendPushToAdmin } from '@/lib/push'
import type { Inquiry, Order, InquiryStatus, Json } from '@/lib/supabase/types'

type FieldErrors = Record<string, string[]>

function editSummary(diff: CustomerEditDiffEntry[]): string {
  if (diff.length === 0) return ''
  return ` Changed: ${diff.map((d) => d.label).join(', ')}.`
}
type ActionResult<T> =
  | { data: T; error: null; fieldErrors: null }
  | { data: null; error: string; fieldErrors: null }
  | { data: null; error: null; fieldErrors: FieldErrors }

interface ReferenceImageInput {
  url_original: string
  url_medium: string
  url_thumb: string
}

export async function createInquiry(
  rawInquiry: unknown,
  rawAddress?: unknown,
  referenceImages?: ReferenceImageInput[]
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

  // items targets a different table (inquiry_items, inserted separately below) and
  // payment_choice is a UI-only convenience field (not a DB column) — strip both before the
  // inquiries insert. payment_choice only drove the real fully_paid/amount_paid fields above.
  const { items, payment_choice: _paymentChoice, ...inquiryData } = parsed.data

  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({ ...inquiryData, status: 'pending' as const, confirmation_token: generateShortToken() })
    .select()
    .single()

  if (inquiryError || !inquiry) {
    return { data: null, error: inquiryError?.message ?? 'Failed to create inquiry', fieldErrors: null }
  }

  // cake_type is UI-only (not a DB column on inquiry_items either) — strip per item.
  const { error: itemsError } = await supabase.from('inquiry_items').insert(
    items.map(({ cake_type: _cakeType, ...item }, i) => ({
      ...item,
      inquiry_id: inquiry.id,
      sort_order: i,
    }))
  )
  if (itemsError) {
    return { data: null, error: itemsError.message, fieldErrors: null }
  }

  if (referenceImages && referenceImages.length > 0) {
    // Photos were already uploaded to storage (see /api/upload) and staged client-side
    // before the inquiry existed — attach them now that it has a real id. Mirrors the
    // public /api/inquiries route's handling of customer-submitted reference photos.
    const { error: imagesError } = await supabase.from('inquiry_images').insert(
      referenceImages.map((img) => ({
        inquiry_id: inquiry.id,
        uploaded_by: 'admin' as const,
        image_type: 'reference' as const,
        url_original: img.url_original,
        url_medium: img.url_medium,
        url_thumb: img.url_thumb,
        caption: '',
      }))
    )
    if (imagesError) console.error('[createInquiry] reference image insert failed:', imagesError.message)
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

  {
    const title = 'New Order Created'
    const body = `${inquiry.customer_name} — ${orderSummary(items)} for ${inquiry.event_date}`
    const { data } = await supabase
      .from('notifications')
      .insert({
        type: 'inquiry_created',
        title,
        body,
        inquiry_id: inquiry.id,
        order_id: null,
        is_read: false,
      })
      .select('id')
      .single()

    if (data) {
      after(() =>
        sendPushToAdmin('inquiry_created', {
          title,
          body,
          url: `/admin/inquiries/${inquiry.id}`,
          notificationId: data.id,
        })
      )
    }
  }

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

  // items targets a different table (inquiry_items, handled separately below) and
  // payment_choice is a UI-only convenience field (not a DB column) — strip both before the
  // inquiries update. payment_choice only drove the real fully_paid/amount_paid fields above.
  const { items, payment_choice: _paymentChoice, ...updateData } = parsed.data

  const { data, error } = await supabase
    .from('inquiries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to update inquiry', fieldErrors: null }
  }

  // `items` is optional on inquiryUpdateSchema — omitted entirely means "don't touch items".
  // When provided, replace the full set: delete then reinsert. Single-admin, low-concurrency
  // tool — a brief zero-items window on insert failure is an acceptable, easily-retried edge
  // case, not worth a transactional RPC.
  if (items !== undefined) {
    const { error: deleteError } = await supabase.from('inquiry_items').delete().eq('inquiry_id', id)
    if (deleteError) {
      return { data: null, error: deleteError.message, fieldErrors: null }
    }
    const { error: itemsError } = await supabase.from('inquiry_items').insert(
      items.map(({ cake_type: _cakeType, ...item }, i) => ({
        ...item,
        inquiry_id: id,
        sort_order: i,
      }))
    )
    if (itemsError) {
      return { data: null, error: itemsError.message, fieldErrors: null }
    }
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

// Quick paid/unpaid toggle for list-row actions — a lighter-weight sibling to updateInquiry
// for when the admin just wants to flip payment status without opening the full edit form.
export async function setInquiryPaymentFlags(
  id: string,
  patch: { fully_paid?: boolean }
): Promise<ActionResult<{ fully_paid: boolean }>> {
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
    .update(patch)
    .eq('id', id)
    .select('fully_paid')
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to update payment status', fieldErrors: null }
  }

  return { data, error: null, fieldErrors: null }
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
    .select('*, delivery_address:delivery_addresses(*), items:inquiry_items(*)')
    .eq('confirmation_token', token)
    .order('sort_order', { referencedTable: 'items' })
    .single()

  if (fetchError || !inquiry) {
    return { data: null, error: 'Inquiry not found', fieldErrors: null }
  }

  if (inquiry.confirmation_sent_at) {
    const ageMs = Date.now() - new Date(inquiry.confirmation_sent_at).getTime()
    if (ageMs > 72 * 60 * 60 * 1000) {
      return { data: null, error: 'This confirmation link has expired. Please contact us for a new one.', fieldErrors: null }
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

  // Customer self-service editing is scoped to the order's first item only (see
  // app/confirm/[token]/page.tsx) — a customer with a multi-item order can only edit their
  // first cake's message/special requirements here; additional items stay admin-editable.
  // inquiries.message_on_cake/special_requirements are legacy flat columns (staged for removal
  // in migration 035, no longer written by createInquiry) — they no longer reflect what's
  // shown to the customer, so this edit targets inquiry_items instead. pickup_time and
  // customer_comments remain order-level and still live on `inquiries`.
  const firstItem = inquiry.items?.[0] ?? null

  const orderLevelEdits = { pickup_time, customer_comments }
  const editDiff = buildCustomerEditDiff(
    {
      pickup_time: inquiry.pickup_time,
      message_on_cake: firstItem?.message_on_cake ?? '',
      special_requirements: firstItem?.special_requirements ?? '',
      delivery_address: inquiry.delivery_address,
    },
    { pickup_time, message_on_cake, special_requirements },
    delivery_address
  )

  async function applyFirstItemEdit() {
    if (!firstItem) return
    const { error: itemUpdateError } = await supabase
      .from('inquiry_items')
      .update({ message_on_cake, special_requirements })
      .eq('id', firstItem.id)
    if (itemUpdateError) console.error('[confirmInquiry] first-item edit failed:', itemUpdateError.message)
  }

  if (action === 'confirm') {
    if (!inquiry.admin_price) {
      return {
        data: null,
        error: 'Price not yet set — please wait for us to finalize your order details',
        fieldErrors: null,
      }
    }

    const { data: updatedInquiry, error: updateError } = await supabase
      .from('inquiries')
      .update({
        ...orderLevelEdits,
        status: 'confirmed',
        customer_confirmed: true,
        customer_confirmed_at: new Date().toISOString(),
        customer_edit_diff: (editDiff.length > 0 ? editDiff : null) as unknown as Json,
      })
      .eq('confirmation_token', token)
      .select()
      .single()

    if (updateError || !updatedInquiry) {
      return { data: null, error: updateError?.message ?? 'Failed to confirm order', fieldErrors: null }
    }

    await applyFirstItemEdit()

    if (inquiry.delivery_type === 'delivery' && delivery_address) {
      await supabase
        .from('delivery_addresses')
        .upsert({ inquiry_id: inquiry.id, ...delivery_address }, { onConflict: 'inquiry_id' })
    }

    // Create order — idempotent. An order may already exist for this inquiry if
    // the admin advanced it to "confirmed" manually (updateInquiryStatus creates
    // an order without setting customer_confirmed), or if this action is retried /
    // double-submitted. In those cases the unique constraint on orders.inquiry_id
    // would reject a second INSERT, so reuse the existing order instead.
    let order: Order | null = null

    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('inquiry_id', inquiry.id)
      .maybeSingle()
    if (existingOrderError) {
      return { data: null, error: existingOrderError.message, fieldErrors: null }
    }

    if (existingOrder) {
      order = existingOrder as unknown as Order
    } else {
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          inquiry_id: inquiry.id,
          status: 'confirmed',
          tracking_token: generateShortToken(),
          final_price: orderTotal(inquiry.admin_price, inquiry.discount, inquiry.delivery_charge),
          deposit_amount: inquiry.deposit_amount,
          delivery_charge: Number(inquiry.delivery_charge),
          delivery_type: inquiry.delivery_type,
        })
        .select()
        .single()

      // 23505 = unique_violation: a concurrent confirm created the order between
      // our lookup and insert. Fall back to the row that won the race.
      if (orderError?.code === '23505') {
        const { data: racedOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('inquiry_id', inquiry.id)
          .single()
        order = racedOrder as unknown as Order
      } else if (orderError || !newOrder) {
        return { data: null, error: orderError?.message ?? 'Failed to create order', fieldErrors: null }
      } else {
        order = newOrder as unknown as Order
        // orders.amount_paid is now trigger-derived from `payments` (see
        // 032_add_payments_table.sql) — a deposit the admin recorded before this order
        // existed needs a real payments row, or it's silently lost the moment the trigger
        // next recomputes the total.
        if (Number(inquiry.amount_paid) > 0) {
          await supabase.from('payments').insert({
            order_id: order.id,
            amount: Number(inquiry.amount_paid),
            method: inquiry.payment_method || 'cash',
            note: 'Deposit recorded before order confirmation',
            receipt_token: generateShortToken(),
          })
        }
      }
    }

    if (!order) {
      return { data: null, error: 'Failed to create order', fieldErrors: null }
    }

    {
      const title = 'Customer Confirmed Order'
      const body = `${inquiry.customer_name} confirmed — ${orderSummary(inquiry.items ?? [])}.${editSummary(editDiff)}`
      const { data } = await supabase
        .from('notifications')
        .insert({
          type: 'customer_confirmed',
          title,
          body,
          inquiry_id: inquiry.id,
          order_id: order.id,
          is_read: false,
        })
        .select('id')
        .single()

      if (data) {
        after(() =>
          sendPushToAdmin('customer_confirmed', {
            title,
            body,
            url: `/admin/orders/${order.id}`,
            notificationId: data.id,
          })
        )
      }
    }

    return { data: { inquiry: updatedInquiry as unknown as Inquiry, order }, error: null, fieldErrors: null }
  } else {
    // action === 'request_changes'
    const { data: updatedInquiry, error: updateError } = await supabase
      .from('inquiries')
      .update({
        ...orderLevelEdits,
        status: 'pending',
        customer_edit_diff: (editDiff.length > 0 ? editDiff : null) as unknown as Json,
      })
      .eq('confirmation_token', token)
      .select()
      .single()

    if (updateError || !updatedInquiry) {
      return { data: null, error: updateError?.message ?? 'Failed to save changes', fieldErrors: null }
    }

    await applyFirstItemEdit()

    if (inquiry.delivery_type === 'delivery' && delivery_address) {
      await supabase
        .from('delivery_addresses')
        .upsert({ inquiry_id: inquiry.id, ...delivery_address }, { onConflict: 'inquiry_id' })
    }

    {
      const title = 'Customer Requested Changes'
      const body = `${inquiry.customer_name} requested changes — review their comments${editSummary(editDiff)}`
      const { data } = await supabase
        .from('notifications')
        .insert({
          type: 'general',
          title,
          body,
          inquiry_id: inquiry.id,
          order_id: null,
          is_read: false,
        })
        .select('id')
        .single()

      if (data) {
        after(() =>
          sendPushToAdmin('general', {
            title,
            body,
            url: `/admin/inquiries/${inquiry.id}`,
            notificationId: data.id,
          })
        )
      }
    }

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
  // delivered/cancelled back onto the inquiry. Without this, admins progressing an
  // inquiry through the status dropdown/next-step button (rather than the customer
  // confirmation link) would set inquiries.status with no matching orders row, making the
  // order invisible everywhere that reads from `orders` (e.g. the calendar).
  const { data: existingOrder, error: orderLookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('inquiry_id', id)
    .maybeSingle()
  if (orderLookupError) return { data: null, error: orderLookupError.message, fieldErrors: null }

  if (existingOrder && (status === 'delivered' || status === 'cancelled')) {
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
      .select('admin_price, discount, deposit_amount, amount_paid, payment_method, delivery_charge, delivery_type')
      .eq('id', id)
      .single()
    if (fetchError || !inquiry) return { data: null, error: fetchError?.message ?? 'Inquiry not found', fieldErrors: null }
    if (!inquiry.admin_price) {
      return { data: null, error: 'Set a price before confirming this order', fieldErrors: null }
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        inquiry_id: id,
        status: 'confirmed',
        tracking_token: generateShortToken(),
        final_price: orderTotal(inquiry.admin_price, inquiry.discount, inquiry.delivery_charge),
        deposit_amount: inquiry.deposit_amount,
        delivery_charge: Number(inquiry.delivery_charge),
        delivery_type: inquiry.delivery_type,
      })
      .select('id')
      .single()
    if (orderError || !newOrder) return { data: null, error: orderError?.message ?? 'Failed to create order', fieldErrors: null }

    // orders.amount_paid is now trigger-derived from `payments` (see
    // 032_add_payments_table.sql) — a deposit the admin recorded before this order existed
    // needs a real payments row, or it's silently lost the moment the trigger next recomputes.
    if (Number(inquiry.amount_paid) > 0) {
      await supabase.from('payments').insert({
        order_id: newOrder.id,
        amount: Number(inquiry.amount_paid),
        method: inquiry.payment_method || 'cash',
        note: 'Deposit recorded before order confirmation',
        receipt_token: generateShortToken(),
      })
    }
  }

  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id)
  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: undefined, error: null, fieldErrors: null }
}
