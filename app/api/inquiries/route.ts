import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publicInquirySchema, minPublicEventDate } from '@/lib/validations/publicInquiry'
import { normalizePhone } from '@/lib/utils'
import { generateShortToken } from '@/lib/tokens'

async function getRatelimit() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    return new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '24h'), prefix: 'zmade:inquiry' })
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = publicInquirySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const data = parsed.data

    const rl = await getRatelimit()
    if (rl) {
      const { success } = await rl.limit(data.customer_phone)
      if (!success) return NextResponse.json({ error: 'Too many submissions. Please try again tomorrow.' }, { status: 429 })
    }

    const supabase = createServiceClient()

    // Server-side mirror of the client-side date picker's `min` — the picker restricts
    // what's selectable, but a direct POST to this endpoint bypasses it entirely, so the
    // minimum lead time must also be enforced here. Admin-entered inquiries go through a
    // separate action (lib/actions/inquiries.ts) that has no such restriction.
    const { data: leadDaysSetting } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'min_lead_days')
      .single()
    const minLeadDays = parseInt((leadDaysSetting?.value as string) ?? '3')
    const earliestDate = minPublicEventDate(Number.isNaN(minLeadDays) ? 3 : minLeadDays)
    if (new Date(data.event_date) < earliestDate) {
      return NextResponse.json(
        { error: 'Invalid data', fieldErrors: { event_date: [`Event date must be at least ${earliestDate.toDateString()}`] } },
        { status: 400 }
      )
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({ phone: normalizePhone(data.customer_phone), name: data.customer_name, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
      .select('id').single()
    if (customerError) console.error('[inquiries] customer upsert failed:', customerError.message)

    // items targets a different table (inquiry_items, inserted separately below) — strip
    // it, along with the address fields that live in their own table, before the
    // inquiries insert. Per-item quantity now lives on each item (see inquiry_items
    // below) instead of the hardcoded `quantity: 1` this route used to set.
    const {
      address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes,
      address_location_link,
      items,
      reference_images,
      ...inquiryFields
    } = data

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        ...inquiryFields,
        admin_price: null,
        deposit_amount: null,
        payment_method: '',
        admin_notes: '',
        customer_id: customer?.id ?? null,
        status: 'pending',
        confirmation_token: generateShortToken(),
      })
      .select('id, customer_name')
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: inquiryError?.message ?? 'Failed to create inquiry' }, { status: 500 })
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
      console.error('[inquiries] item insert failed:', itemsError.message)
      return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })
    }

    if (reference_images.length > 0) {
      const { error: imagesError } = await supabase.from('inquiry_images').insert(
        reference_images.map(img => ({
          inquiry_id: inquiry.id,
          uploaded_by: 'customer' as const,
          image_type: 'reference' as const,
          url_original: img.url_original,
          url_medium: img.url_medium,
          url_thumb: img.url_thumb,
          caption: '',
        }))
      )
      // Reference photos are already uploaded to storage by this point (see
      // /api/upload/order) — a failed insert here would silently lose the customer's
      // photos from the inquiry with no record of it, so this must never fail quietly.
      if (imagesError) console.error('[inquiries] reference image insert failed:', imagesError.message)
    }

    if (data.delivery_type === 'delivery' && address_area) {
      await supabase.from('delivery_addresses').insert({
        inquiry_id: inquiry.id,
        governorate: address_governorate as any,
        area: address_area,
        block: address_block,
        street: address_street,
        house_no: address_house_no,
        extra_notes: address_extra_notes,
        location_link: address_location_link,
      })
    }

    await supabase.from('notifications').insert({
      type: 'inquiry_created',
      title: 'New Inquiry (Public Form)',
      body: `${data.customer_name} submitted a new cake order request`,
      inquiry_id: inquiry.id,
      order_id: null,
      is_read: false,
    })

    return NextResponse.json({ inquiry_id: inquiry.id, customer_name: inquiry.customer_name })
  } catch (err) {
    console.error('Public inquiry error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
