import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generatePortalToken, verifyPortalToken } from '@/lib/portal'
import { normalizePhone, levenshteinDistance } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Builds an ILIKE pattern that matches strings containing `digits` in order, with any
// characters (including none) interspersed — e.g. "66857560" -> "%6%6%8%5%7%5%6%0%", which
// matches legacy stored values like "6685 7560" or "+965-6685-7560" regardless of formatting.
const digitWildcardPattern = (digits: string) => `%${digits.split('').join('%')}%`

// ── Rate limiter ───────────────────────────────────────────────────────────────

async function getRatelimit() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1h'),
      prefix: 'zmade:myorders',
    })
  } catch { return null }
}

// ── Order query helper ─────────────────────────────────────────────────────────

type OrderResult = {
  id: string
  cake_size: string
  flavor: string
  order_type: string
  item_name: string
  occasion: string
  event_date: string
  status: string
  created_at: string
  order?: { tracking_token: string; final_price: string; status: string }
}

async function fetchOrdersForCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<OrderResult[]> {
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, cake_size, flavor, order_type, item_name, occasion, event_date, status, created_at, orders(id, tracking_token, status, final_price)')
    .eq('customer_id', customerId)
    .order('event_date', { ascending: false })
    .limit(50)

  return (inquiries ?? []).map((inq: any) => {
    const result: OrderResult = {
      id: inq.id,
      cake_size: inq.cake_size,
      flavor: inq.flavor,
      order_type: inq.order_type,
      item_name: inq.item_name,
      occasion: inq.occasion,
      event_date: inq.event_date,
      status: inq.status,
      created_at: inq.created_at,
    }
    const orderRow = Array.isArray(inq.orders) ? inq.orders[0] : inq.orders
    if (orderRow?.tracking_token) {
      result.order = {
        tracking_token: orderRow.tracking_token,
        final_price: orderRow.final_price,
        status: orderRow.status,
      }
    }
    return result
  })
}

// ── GET handler ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim()
  const rl = await getRatelimit()
  if (rl) {
    const { success } = await rl.limit(ip)
    if (!success) return NextResponse.json({ orders: [] }, { status: 429 })
  }

  const { searchParams } = request.nextUrl
  const token = searchParams.get('token')

  // Mode A — token-based lookup
  if (token) {
    const customerId = verifyPortalToken(token)
    if (!customerId) return NextResponse.json({ orders: [] })
    const supabase = createServiceClient()
    const [orders, { data: customerRow }] = await Promise.all([
      fetchOrdersForCustomer(supabase, customerId),
      supabase.from('customers').select('name').eq('id', customerId).maybeSingle() as unknown as Promise<{ data: { name: string } | null }>,
    ])
    return NextResponse.json({ orders, customer_name: customerRow?.name ?? null })
  }

  // Mode B — name + phone lookup
  const phone = searchParams.get('phone')
  const name = searchParams.get('name')

  if (!phone || phone.trim().length < 6 || !name || name.trim().length < 2) {
    return NextResponse.json({ orders: [] })
  }

  const supabase = createServiceClient()

  const normalizedIncomingPhone = normalizePhone(phone)

  // Primary path — write-time normalization (see app/api/inquiries/route.ts and
  // lib/actions/customers.ts) means new/updated rows store phone as normalizePhone()
  // output already, so a direct match is the common case.
  const { data: exactMatch } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('phone', normalizedIncomingPhone)
    .maybeSingle() as { data: { id: string; name: string; phone: string } | null; error: unknown }

  let customer: { id: string; name: string; phone: string } | null = exactMatch

  if (!customer) {
    // Fallback for legacy rows stored in whatever format they were originally entered
    // (spaces, dashes, missing/extra country code). Narrow candidates via a digit-aware
    // ILIKE pattern on the last 8 digits, then confirm with a normalized JS comparison.
    const last8 = normalizedIncomingPhone.slice(-8)
    const { data: candidates } = await supabase
      .from('customers')
      .select('id, name, phone')
      .ilike('phone', digitWildcardPattern(last8))
      .limit(10) as { data: { id: string; name: string; phone: string }[] | null; error: unknown }

    customer = (candidates ?? []).find(
      (c) => normalizePhone(c.phone ?? '') === normalizedIncomingPhone
    ) ?? null
  }

  if (!customer) return NextResponse.json({ orders: [] })

  // Name is a tolerant edit-distance check (typos/case) — phone is the hard identifier and
  // has already uniquely resolved to this one customer, so loosening the name check doesn't
  // widen who can be matched.
  const normalizedStoredName = normalize(customer.name ?? '')
  const normalizedIncomingName = normalize(name)
  const distance = levenshteinDistance(normalizedStoredName, normalizedIncomingName)
  const threshold = Math.max(2, Math.ceil(normalizedIncomingName.length * 0.2))
  if (distance > threshold) {
    return NextResponse.json({ orders: [] })
  }

  const orders = await fetchOrdersForCustomer(supabase, customer.id)
  const portal_token = generatePortalToken(customer.id)

  return NextResponse.json({ orders, portal_token, customer_name: customer.name })
}
