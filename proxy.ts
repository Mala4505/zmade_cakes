import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'

// ── Rate limiters ──────────────────────────────────────────────────────────
// Only initialize if Redis credentials are present (skip in local dev without Upstash)

const redisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const limiters = redisConfigured
  ? (() => {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      return {
        login: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, '15 m'),
          prefix: 'zmade:login',
        }),
        confirmRead: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(30, '1 m'),
          prefix: 'zmade:confirm:read',
        }),
        confirmWrite: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, '10 m'),
          prefix: 'zmade:confirm:write',
        }),
        trackRead: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(60, '1 m'),
          prefix: 'zmade:track',
        }),
        notify: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, '1 m'),
          prefix: 'zmade:notify',
        }),
        admin: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(200, '1 m'),
          prefix: 'zmade:admin',
        }),
        global: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(100, '1 m'),
          prefix: 'zmade:global',
        }),
      }
    })()
  : null

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<NextResponse | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests — please wait and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  }
  return null
}

// ── Main proxy ─────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request)
  const method = request.method

  // ── Route-specific rate limiting ──────────────────────────────────────
  if (limiters) {
    let rateLimitResponse: NextResponse | null = null

    if (pathname === '/login' && method === 'POST') {
      rateLimitResponse = await checkRateLimit(limiters.login, ip)
    } else if (pathname.startsWith('/confirm/')) {
      const limiter = method === 'POST' ? limiters.confirmWrite : limiters.confirmRead
      rateLimitResponse = await checkRateLimit(limiter, ip)
    } else if (pathname.startsWith('/track/')) {
      rateLimitResponse = await checkRateLimit(limiters.trackRead, ip)
    } else if (pathname === '/api/notify') {
      rateLimitResponse = await checkRateLimit(limiters.notify, ip)
    } else if (pathname.startsWith('/admin') || pathname.startsWith('/(admin)')) {
      rateLimitResponse = await checkRateLimit(limiters.admin, ip)
    } else {
      rateLimitResponse = await checkRateLimit(limiters.global, ip)
    }

    if (rateLimitResponse) return rateLimitResponse
  }

  // ── Supabase session refresh ──────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Admin route protection ────────────────────────────────────────────
  const isAdminRoute =
    pathname.startsWith('/(admin)') ||
    (pathname !== '/login' &&
      !pathname.startsWith('/confirm') &&
      !pathname.startsWith('/track') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/_next'))

  if (isAdminRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/admin/calendar', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
