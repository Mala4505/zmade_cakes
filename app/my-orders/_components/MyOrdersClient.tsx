'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import PhoneInput from '@/components/PhoneInput'
import { appUrl } from '@/lib/links'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { InquiryStatus, OrderStatus } from '@/lib/supabase/types'

interface OrderResult {
  id: string
  cake_size: string
  flavor: string
  occasion: string
  event_date: string
  status: string
  created_at: string
  order?: {
    tracking_token: string
    final_price: string
    status: string
  }
}

interface Props {
  businessPhone: string
  businessInstagram: string
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function MyOrdersContent({ businessPhone, businessInstagram }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<OrderResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [tokenMode, setTokenMode] = useState(false)
  const [copied, setCopied] = useState(false)

  const waNumber = businessPhone
    ? businessPhone.replace(/\D/g, '').replace(/^(?!965)/, '965')
    : ''

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return

    const controller = new AbortController()
    setTokenMode(true)
    setLoading(true)
    setError(null)
    setPortalToken(null)

    fetch(`/api/my-orders?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body?.error ?? 'Something went wrong. Please try again.')
          setTokenMode(false)
          return
        }
        const data = await res.json()
        setOrders(data.orders ?? [])
        setSearched(true)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Could not connect. Please check your connection and try again.')
        setTokenMode(false)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [searchParams])

  async function handleSearch() {
    if (loading) return
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).')
      return
    }
    if (!phone.trim() || phone.trim().length < 6) {
      setError('Please enter a valid phone number.')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(false)
    setPortalToken(null)

    try {
      const res = await fetch(
        `/api/my-orders?phone=${encodeURIComponent(phone.trim())}&name=${encodeURIComponent(name.trim())}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setOrders(data.orders ?? [])
      setPortalToken(data.portal_token ?? null)
      setSearched(true)
    } catch {
      setError('Could not connect. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleNotYou() {
    setOrders([])
    setSearched(false)
    setTokenMode(false)
    setPortalToken(null)
    setError(null)
    setLoading(false)
    router.replace('/my-orders')
  }

  function handleCopy() {
    const url = `${appUrl}/my-orders?token=${portalToken}`
    navigator.clipboard.writeText(url)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => { setError('Could not copy link. Please copy it manually.') })
  }

  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Header */}
      <header
        className="border-b px-5 py-5 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-teal)' }}
        >
          ZMade Cakes
        </p>
        {businessInstagram && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {businessInstagram} · Kuwait
          </p>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title */}
        <div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            Your Orders
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            Enter your name and phone number to view your cake orders
          </p>
        </div>

        {/* Search form — hidden in token mode */}
        {!tokenMode && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch() }}
            className="flex flex-col gap-3"
          >
            {/* Name input */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="customer-name"
                className="text-xs font-medium"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                Full Name
              </label>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As you gave when ordering"
                className="rounded-lg border px-3 py-2 text-sm w-full outline-none transition-all"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-teal)'
                  e.currentTarget.style.borderColor = 'var(--color-teal)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              />
            </div>

            {/* Phone input + submit */}
            <div className="flex gap-2">
              <PhoneInput
                value={phone}
                onChange={(value) => setPhone(value)}
                className="flex-1"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--color-teal)',
                  color: 'var(--color-cream)',
                }}
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}

        {/* Loading indicator */}
        {loading && (
          <p className="text-sm text-center" style={{ color: 'var(--color-ink-muted)' }}>
            Searching…
          </p>
        )}

        {/* Empty state */}
        {!loading && searched && orders.length === 0 && (
          <div
            className="rounded-2xl border p-6 flex flex-col items-center gap-3 text-center"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              No orders found for this number
            </p>
            <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              Submitted a new order recently? It may take a moment to appear.
            </p>
            <Link
              href="/order"
              className="text-sm font-medium mt-1"
              style={{ color: 'var(--color-teal)' }}
            >
              Place a new order →
            </Link>
          </div>
        )}

        {/* "Not you?" — shown whenever in token mode, regardless of result count */}
        {tokenMode && !loading && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNotYou}
              className="text-xs font-medium"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Not you?
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border p-5 flex flex-col gap-3"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                {/* Headline + badge */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                    {item.cake_size} · {item.flavor}
                  </p>
                  <StatusBadge
                    status={(item.order?.status ?? item.status) as OrderStatus | InquiryStatus}
                    context="customer"
                  />
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-1">
                  {item.occasion && (
                    <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                      {item.occasion}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                    Event: {formatEventDate(item.event_date)}
                  </p>
                </div>

                {/* Order links */}
                {item.order?.tracking_token && (
                  <div className="flex gap-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <Link
                      href={`/track/${item.order.tracking_token}`}
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-teal)' }}
                    >
                      Track Order →
                    </Link>
                    <Link
                      href={`/invoice/${item.order.tracking_token}`}
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-ink-secondary)' }}
                    >
                      View Invoice →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Portal link section — shown after name+phone search with results */}
        {!tokenMode && portalToken !== null && orders.length > 0 && (
          <div
            className="rounded-2xl border p-4 flex flex-col gap-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              Bookmark or copy this link to access your orders anytime without re-entering your details
            </p>
            <div className="flex items-center gap-2">
              <span
                className="flex-1 rounded-lg border px-3 py-2 text-xs truncate"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-cream)',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {`${appUrl}/my-orders?token=${portalToken}`}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-opacity"
                style={{
                  backgroundColor: copied ? '#dcfce7' : 'var(--color-teal)',
                  color: copied ? '#166534' : 'var(--color-cream)',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {waNumber && (
          <div className="text-center pt-2">
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Questions? Message Zainab on WhatsApp
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function MyOrdersPage({ businessPhone, businessInstagram }: Props) {
  return (
    <Suspense fallback={null}>
      <MyOrdersContent businessPhone={businessPhone} businessInstagram={businessInstagram} />
    </Suspense>
  )
}
