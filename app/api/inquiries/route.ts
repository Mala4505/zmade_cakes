import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const publicInquirySchema = z.object({
  customer_name: z.string().min(2).max(150).trim(),
  customer_phone: z.string().min(6).max(30).trim(),
  cake_size: z.string().min(1).max(100),
  flavor: z.string().min(1).max(150),
  occasion: z.string().max(150).optional().default(''),
  theme: z.string().max(200).optional().default(''),
  decoration_style: z.string().min(1).max(100),
  message_on_cake: z.string().max(255).optional().default(''),
  special_requirements: z.string().max(1000).optional().default(''),
  allergen_nut_free: z.boolean().default(false),
  allergen_gluten_free: z.boolean().default(false),
  allergen_dairy_free: z.boolean().default(false),
  allergen_egg_free: z.boolean().default(false),
  allergen_halal: z.boolean().default(false),
  allergen_other: z.string().max(500).optional().default(''),
  event_date: z.string().min(1),
  pickup_time: z.string().optional().nullable(),
  delivery_type: z.enum(['pickup', 'delivery']),
  source: z.literal('public_form'),
  address_governorate: z.string().optional().default('capital'),
  address_area: z.string().optional().default(''),
  address_block: z.string().optional().default(''),
  address_street: z.string().optional().default(''),
  address_house_no: z.string().optional().default(''),
  address_extra_notes: z.string().optional().default(''),
})
.superRefine((data, ctx) => {
  if (data.delivery_type === 'delivery') {
    if (!data.address_area?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Area is required for delivery', path: ['address_area'] })
    if (!data.address_block?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Block is required', path: ['address_block'] })
    if (!data.address_street?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Street is required', path: ['address_street'] })
    if (!data.address_house_no?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'House number is required', path: ['address_house_no'] })
  }
})

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

    const { address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes, ...inquiryFields } = data

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        ...inquiryFields,
        quantity: 1,
        admin_price: null,
        advance_amount: null,
        advance_paid: false,
        balance_paid: false,
        payment_method: '',
        admin_notes: '',
        priority: 0,
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
