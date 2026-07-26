import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publicInquirySchema } from '@/lib/validations/publicInquiry'
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

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert({ phone: normalizePhone(data.customer_phone), name: data.customer_name, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
      .select('id').single()
    if (customerError) console.error('[inquiries] customer upsert failed:', customerError.message)

    // cake_type is a UI-only convenience field (not a DB column) — strip before insert,
    // along with the address fields that live in their own table.
    const {
      address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes,
      address_location_link,
      cake_type: _cakeType,
      reference_images,
      ...inquiryFields
    } = data

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        ...inquiryFields,
        quantity: 1,
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

    if (reference_images.length > 0) {
      await supabase.from('inquiry_images').insert(
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
