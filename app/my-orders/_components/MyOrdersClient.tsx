'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import PhoneInput from '@/components/PhoneInput'
import { Button, CakeLoader } from '@/components/ui'
import { Truck, Receipt } from '@phosphor-icons/react'
import { Navbar } from '@/components/public/Navbar'
import { appUrl } from '@/lib/links'
import { EASE_OUT_QUART, holdMinimumVisible } from '@/lib/motion'
import { KUWAIT_PHONE_REGEX } from '@/lib/validations/inquiry'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { orderSummary, formatKWD } from '@/lib/utils'
import type { InquiryStatus, OrderStatus } from '@/lib/supabase/types'

interface OrderResultItem {
  order_type: string
  item_name: string
  cake_size: string
  flavor: string
  occasion: string
  quantity: number
}

interface OrderResult {
  id: string
  items: OrderResultItem[]
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
      day: '2-digit',
      month: '2-digit',
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
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({})
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [tokenMode, setTokenMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [customerName, setCustomerName] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return

    const controller = new AbortController()
    setTokenMode(true)
    setLoading(true)
    setError(null)
    setPortalToken(null)
    const startedAt = Date.now()

    fetch(`/api/my-orders?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          // Errors surface immediately — never held back to let the loader finish.
          const body = await res.json().catch(() => ({}))
          setError(body?.error ?? 'Something went wrong. Please try again.')
          setTokenMode(false)
          setLoading(false)
          return
        }
        const data = await res.json()
        await holdMinimumVisible(startedAt, 1400)
        setOrders(data.orders ?? [])
        setCustomerName(data.customer_name ?? null)
        setSearched(true)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Could not connect. Please check your connection and try again.')
        setTokenMode(false)
        setLoading(false)
      })

    return () => controller.abort()
  }, [searchParams])

  async function handleSearch() {
    if (loading) return

    const nextFieldErrors: { name?: string; phone?: string } = {}
    if (!name.trim() || name.trim().length < 2) {
      nextFieldErrors.name = 'Please enter your full name (at least 2 characters).'
    }
    if (!KUWAIT_PHONE_REGEX.test(phone.trim())) {
      nextFieldErrors.phone = 'Enter a valid phone number (e.g. +965 6685 7560).'
    }
    if (nextFieldErrors.name || nextFieldErrors.phone) {
      setFieldErrors(nextFieldErrors)
      return
    }
    setFieldErrors({})

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
      setCustomerName(data.customer_name ?? null)
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
    setCustomerName(null)
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

  const reduceMotion = useReducedMotion()

  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Cover — introduces the page like a chapter opener rather than a plain title */}
        <div
          className="zm-cover-texture rounded-2xl px-5 py-6"
          style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-teal-deep)' }}
          >
            Your Orders
          </p>
          <h1
            className="text-3xl font-bold leading-tight mt-1.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            {customerName ? `Hi, ${customerName.split(' ')[0]}` : 'Find Your Orders'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-ink-secondary)' }}>
            {customerName
              ? "Everything you've asked us to bake."
              : 'Enter your name and phone number below to find them.'}
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
                onChange={(e) => {
                  setName(e.target.value)
                  setFieldErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev))
                }}
                placeholder="As you gave when ordering"
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? 'customer-name-error' : undefined}
                className="rounded-lg border px-3 py-2 text-base w-full outline-none transition-all"
                style={{
                  borderColor: fieldErrors.name ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-ink)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-teal)'
                  e.currentTarget.style.borderColor = 'var(--color-teal)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.borderColor = fieldErrors.name
                    ? 'var(--color-danger)'
                    : 'var(--color-border)'
                }}
              />
              {fieldErrors.name && (
                <p id="customer-name-error" className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Phone input + submit */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <PhoneInput
                  id="customer-phone"
                  value={phone}
                  onChange={(value) => {
                    setPhone(value)
                    setFieldErrors((prev) => (prev.phone ? { ...prev, phone: undefined } : prev))
                  }}
                  className="flex-1"
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby={fieldErrors.phone ? 'customer-phone-error' : undefined}
                  size="base"
                />
                <Button type="submit" loading={loading} className="shrink-0">
                  {loading ? 'Searching…' : 'Search'}
                </Button>
              </div>
              {fieldErrors.phone && (
                <p id="customer-phone-error" className="text-xs" style={{ color: 'var(--color-danger)' }}>
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        )}

        {/* Loading indicator — only for the tokenMode auto-lookup (no form/button
            visible in that case); the name+phone search already shows its own
            spinner on the Search button, so this would otherwise double up. */}
        {loading && tokenMode && (
          <CakeLoader size={88} label="Finding your orders…" className="py-4" />
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
              href="/inquire"
              className="text-sm font-medium mt-1"
              style={{ color: 'var(--color-teal)' }}
            >
              Submit a new inquiry →
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
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ink-muted)' }}>
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </p>
            {orders.map((item, index) => (
              <motion.div
                key={item.id}
                className="zm-ticket"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : index * 0.06, ease: EASE_OUT_QUART }}
              >
                {/* Headline + badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                      {orderSummary(item.items)}
                    </p>
                    {item.items.length === 1 && item.items[0].occasion ? (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                        {item.items[0].occasion}
                      </p>
                    ) : item.items.length > 1 ? (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                        {item.items.length} items
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    status={(item.order?.status ?? item.status) as OrderStatus | InquiryStatus}
                    context="customer"
                  />
                </div>

                <div className="zm-ticket-perf" />

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="block" style={{ color: 'var(--color-ink-muted)' }}>Event</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                      {formatEventDate(item.event_date)}
                    </span>
                  </div>
                  <div>
                    <span className="block" style={{ color: 'var(--color-ink-muted)' }}>Total</span>
                    {item.order?.final_price ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {formatKWD(item.order.final_price)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-ink-muted)' }}>Price pending</span>
                    )}
                  </div>
                </div>

                {/* Order links */}
                {item.order?.tracking_token && (
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/track/${item.order.tracking_token}`}
                      className="flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-lg text-xs font-medium border border-transparent transition-colors bg-[var(--color-surface-raised)] text-[var(--color-ink-secondary)] hover:border-[var(--color-border-strong)]"
                    >
                      <Truck size={14} weight="bold" />
                      Track Order
                    </Link>
                    <Link
                      href={`/invoice/${item.order.tracking_token}`}
                      className="flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-transparent text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-raised)]"
                    >
                      <Receipt size={14} weight="bold" />
                      View Invoice
                    </Link>
                  </div>
                )}
              </motion.div>
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
