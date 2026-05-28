import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Token helpers ──────────────────────────────────────────────────────────────

function generatePortalToken(customerId: string): string {
  const secret = process.env.PORTAL_TOKEN_SECRET ?? 'dev-secret'
  const hmac = createHmac('sha256', secret).update(customerId).digest('hex')
  return Buffer.from(`${customerId}:${hmac}`).toString('base64url')
}

function verifyPortalToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const colonIdx = decoded.indexOf(':')
    if (colonIdx === -1) return null
    const customerId = decoded.slice(0, colonIdx)
    const hmac = decoded.slice(colonIdx + 1)
    const secret = process.env.PORTAL_TOKEN_SECRET ?? 'dev-secret'
    const expected = createHmac('sha256', secret).update(customerId).digest('hex')
    const hmacBuf = Buffer.from(hmac)
    const expectedBuf = Buffer.from(expected)
    if (hmacBuf.byteLength !== expectedBuf.byteLength) return null
    if (!timingSafeEqual(hmacBuf, expectedBuf)) return null
    return customerId
  } catch { return null }
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

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
    .select('id, cake_size, flavor, occasion, event_date, status, created_at, orders(id, tracking_token, status, final_price)')
    .eq('customer_id', customerId)
    .order('event_date', { ascending: false })
    .limit(50)

  return (inquiries ?? []).map((inq: any) => {
    const result: OrderResult = {
      id: inq.id,
      cake_size: inq.cake_size,
      flavor: inq.flavor,
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
    const orders = await fetchOrdersForCustomer(supabase, customerId)
    return NextResponse.json({ orders })
  }

  // Mode B — name + phone lookup
  const phone = searchParams.get('phone')
  const name = searchParams.get('name')

  if (!phone || phone.trim().length < 6 || !name || name.trim().length < 2) {
    return NextResponse.json({ orders: [] })
  }

  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('phone', phone.trim())
    .single() as { data: { id: string; name: string } | null; error: unknown }

  if (!customer) return NextResponse.json({ orders: [] })

  if (normalize(customer.name ?? '') !== normalize(name)) {
    return NextResponse.json({ orders: [] })
  }

  const orders = await fetchOrdersForCustomer(supabase, customer.id)
  const portal_token = generatePortalToken(customer.id)

  return NextResponse.json({ orders, portal_token })
}
