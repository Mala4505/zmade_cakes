import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publicInquirySchema } from '@/lib/validations/publicInquiry'

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
      .upsert({ phone: data.customer_phone, name: data.customer_name, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
      .select('id').single()
    if (customerError) console.error('[inquiries] customer upsert failed:', customerError.message)

    // allergen_gluten_free / allergen_halal are validated by the public form schema but are no
    // longer settable columns (Row-only, see lib/supabase/types.ts) — strip before insert.
    const {
      address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes,
      allergen_gluten_free: _allergenGlutenFree, allergen_halal: _allergenHalal,
      ...inquiryFields
    } = data

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        ...inquiryFields,
        quantity: 1,
        admin_price: null,
        advance_amount: null,
        advance_paid: false,
        payment_method: '',
        admin_notes: '',
        customer_id: customer?.id ?? null,
        status: 'pending',
      })
      .select('id, customer_name')
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: inquiryError?.message ?? 'Failed to create inquiry' }, { status: 500 })
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
