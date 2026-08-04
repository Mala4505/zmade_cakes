import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/actions/settings'
import { formatDate, formatKWD, orderSummary, myOrdersLink } from '@/lib/utils'
import { generatePortalToken } from '@/lib/portal'
import { PageHeader } from '@/components/admin/PageHeader'
import { InquiryStatusSelect } from '@/components/admin/InquiryStatusSelect'
import InquiryRowActions from './_components/InquiryRowActions'
import { balanceOwed, orderTotal } from '@/lib/payments'
import Link from 'next/link'
import { Plus, CheckCircle, Circle } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import type { InquiryStatus, WhatsAppTemplates } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Inquiries' }

type PaymentStatus = 'unpaid' | 'partial' | 'paid'

const STATUS_OPTIONS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Inquired' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Dispatched' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_OPTIONS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
]

const SORT_OPTIONS = [
  { value: 'event_date', label: 'Event date ↑' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Created ↓' },
  { value: 'price', label: 'Price ↓' },
]

// Pipeline order for the "Status" sort — mirrors how an order actually
// progresses, with cancelled last since it's a dead end rather than a stage.
const STATUS_ORDER: Record<InquiryStatus, number> = {
  pending: 0,
  confirmed: 1,
  ready: 2,
  delivered: 3,
  cancelled: 4,
}

const PAGE_SIZE = 25
// Upper bound for the "Status" sort's wider fetch (see below) — comfortably above
// any realistic single-view row count for this business, so nothing gets dropped.
const STATUS_SORT_FETCH_CAP = 500

async function getInquiries(status: string, payment: string, sort: string, page: number, q?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('inquiries')
    .select(
      'id, customer_name, customer_phone, cake_size, flavor, occasion, order_type, item_name, event_date, status, admin_price, discount, delivery_charge, deposit_amount, amount_paid, fully_paid, payment_status, created_at, customer_id, customer_confirmed, confirmation_token',
      { count: 'exact' }
    )

  if (sort === 'created_at') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'price') {
    query = query.order('admin_price', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('event_date', { ascending: true })
  }

  if (status && status !== 'all') {
    query = query.eq('status', status as InquiryStatus)
  } else {
    // Default view excludes cancelled orders — they'd otherwise clutter the
    // day-to-day list. Explicitly filtering to "Cancelled" above still shows them.
    query = query.neq('status', 'cancelled')
  }
  if (payment && payment !== 'all') {
    query = query.eq('payment_status', payment)
  }
  if (q?.trim()) {
    query = query.or(`customer_name.ilike.%${q.trim()}%,customer_phone.ilike.%${q.trim()}%`)
  }

  // Postgrest can't order by an arbitrary enum sequence, so the pipeline-order
  // "Status" sort is applied client-side after a wider fetch, with the page window
  // then sliced in JS too — DB-level `.range()` pagination can't be combined with a
  // sort it doesn't know about. Every other sort paginates directly at the DB level.
  if (sort === 'status') {
    const { data, error, count } = await query.limit(STATUS_SORT_FETCH_CAP)
    if (error) throw new Error(`Inquiries: failed to load inquiries — ${error.message}`)
    const rows = (data ?? []).sort(
      (a, b) => STATUS_ORDER[a.status as InquiryStatus] - STATUS_ORDER[b.status as InquiryStatus]
    )
    const from = (page - 1) * PAGE_SIZE
    return { data: rows.slice(from, from + PAGE_SIZE), count: count ?? 0 }
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(`Inquiries: failed to load inquiries — ${error.message}`)
  return { data: data ?? [], count: count ?? 0 }
}

async function getCustomerInquiryCounts(customerIds: string[]): Promise<Record<string, number>> {
  if (customerIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.from('inquiries').select('customer_id').in('customer_id', customerIds)
  if (error) throw new Error(`Inquiries: failed to load customer inquiry counts — ${error.message}`)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.customer_id) counts[row.customer_id] = (counts[row.customer_id] ?? 0) + 1
  }
  return counts
}

function isUrgent(eventDate: string): { label: string } | null {
  const now = new Date()
  const event = new Date(eventDate)
  const diffMs = event.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 0) return null
  if (diffHours <= 24) return { label: 'Today' }
  if (diffHours <= 48) return { label: 'Tomorrow' }
  return null
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-ink)',
}

// Builds a /admin/inquiries URL carrying every filter param explicitly (even
// defaults) so pagination links always reflect the exact view currently on screen.
function buildInquiriesHref({ q, status, payment, sort, page }: { q?: string; status: string; payment: string; sort: string; page: number }) {
  const sp = new URLSearchParams()
  if (q?.trim()) sp.set('q', q.trim())
  sp.set('status', status)
  sp.set('payment', payment)
  sp.set('sort', sort)
  sp.set('page', String(page))
  return `/admin/inquiries?${sp.toString()}`
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; sort?: string; q?: string; page?: string }>
}) {
  const { status = 'all', payment = 'all', sort = 'event_date', q, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [{ data: inquiries, count: totalCount }, settingsResult] = await Promise.all([
    getInquiries(status, payment, sort, page, q),
    getSettings(['whatsapp_templates']),
  ])
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasActiveFilters = Boolean(q?.trim()) || status !== 'all' || payment !== 'all' || sort !== 'event_date'

  const customerIds = [...new Set(
    inquiries.filter((i: any) => i.customer_id).map((i: any) => i.customer_id as string)
  )]
  const customerInquiryCounts = await getCustomerInquiryCounts(customerIds)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Inquiries"
        action={
          <Link
            href="/admin/inquiries/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            <Plus size={15} weight="bold" />
            New
          </Link>
        }
      />

      {/* Filter row */}
      <form method="GET" className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or phone…"
          className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-[var(--color-teal-light)]"
          style={selectStyle}
        />
        <select
          name="status"
          defaultValue={status}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={selectStyle}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          name="payment"
          defaultValue={payment}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={selectStyle}
        >
          {PAYMENT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="px-3 py-2 text-sm rounded-lg border outline-none"
          style={selectStyle}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg font-medium transition-all active:scale-[0.97]"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          Filter
        </button>
        {hasActiveFilters && (
          <Link
            href="/admin/inquiries"
            className="px-4 py-2 text-sm rounded-lg font-medium border transition-all active:scale-[0.97]"
            style={selectStyle}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div
        className="rounded-xl border overflow-x-auto"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {inquiries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No inquiries found</p>
            {hasActiveFilters ? (
              <Link
                href="/admin/inquiries"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--color-teal)' }}
              >
                Clear filters
              </Link>
            ) : (
              <Link
                href="/admin/inquiries/new"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--color-teal)' }}
              >
                <Plus size={14} weight="bold" /> Create the first one
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr
                className="border-b text-left"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {['Customer', 'Event Date', 'Status', 'Payment', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--color-ink-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq: any) => {
                const hasNoPrice = inq.admin_price === null || inq.admin_price === undefined
                const urgent = isUrgent(inq.event_date)
                const isReturning = inq.customer_id && (customerInquiryCounts[inq.customer_id] ?? 0) > 1
                const isPaid = inq.fully_paid
                const orderTotalAmt = inq.admin_price ? orderTotal(inq.admin_price, inq.discount, inq.delivery_charge) : null
                const balance = orderTotalAmt !== null
                  ? balanceOwed(orderTotalAmt, inq.amount_paid, inq.fully_paid)
                  : null
                // Binary paid/not-paid — the amount shown is contextual: the settled total once
                // paid, or what's still outstanding (net of any deposit already credited) if not.
                const paymentAmount = isPaid ? orderTotalAmt : balance

                return (
                  <tr
                    key={inq.id}
                    style={
                      hasNoPrice
                        ? { outline: '1.5px solid var(--color-danger)', outlineOffset: '-1px' }
                        : undefined
                    }
                    className="border-b last:border-0 hover:bg-[var(--color-surface-raised)] transition-colors"
                    data-has-no-price={hasNoPrice ? 'true' : undefined}
                  >
                    {/* Customer */}
                    <td className="px-3 py-3 align-middle">
                      <Link href={`/admin/inquiries/${inq.id}`} className="block">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                            {inq.customer_name}
                          </span>
                          {isReturning && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
                            >
                              ↩ Returning
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                          {orderSummary(inq)}
                        </p>
                      </Link>
                    </td>

                    {/* Event Date */}
                    <td className="px-3 py-3 align-middle">
                      <Link href={`/admin/inquiries/${inq.id}`} className="block">
                        <span
                          className="text-xs font-mono block"
                          style={{ color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-mono)' }}
                        >
                          {formatDate(inq.event_date)}
                        </span>
                        {urgent && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                            style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
                          >
                            {urgent.label}
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Status inline select */}
                    <td className="px-3 py-3 align-middle">
                      <InquiryStatusSelect inquiryId={inq.id} value={inq.status as InquiryStatus} />
                    </td>

                    {/* Payment status — bare icon + amount, binary paid/not-paid */}
                    <td className="px-3 py-3 align-middle">
                      {paymentAmount !== null ? (
                        <span className="inline-flex items-center gap-1.5">
                          {isPaid ? (
                            <CheckCircle size={14} weight="fill" style={{ color: 'var(--color-success)' }} />
                          ) : (
                            <Circle size={14} weight="bold" style={{ color: 'var(--color-warning)' }} />
                          )}
                          <span
                            className="text-xs font-mono font-medium"
                            style={{
                              color: isPaid ? 'var(--color-success)' : 'var(--color-ink)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {formatKWD(paymentAmount.toFixed(3))}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Quick actions */}
                    <td className="px-3 py-3 align-middle pr-4">
                      <InquiryRowActions
                        inquiry={{
                          id: inq.id,
                          customer_name: inq.customer_name,
                          customer_phone: inq.customer_phone,
                          status: inq.status,
                          customer_confirmed: inq.customer_confirmed,
                          admin_price: inq.admin_price,
                          discount: inq.discount,
                          delivery_charge: inq.delivery_charge,
                          amount_paid: inq.amount_paid,
                          fully_paid: inq.fully_paid,
                          confirmation_token: inq.confirmation_token,
                        }}
                        templates={templates}
                        fallbackLinkUrl={
                          inq.customer_id ? myOrdersLink(generatePortalToken(inq.customer_id)) : undefined
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Link
                href={buildInquiriesHref({ q, status, payment, sort, page: page - 1 })}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.97]"
                style={{ ...selectStyle, pointerEvents: page <= 1 ? 'none' : undefined, opacity: page <= 1 ? 0.5 : 1 }}
              >
                Previous
              </Link>
              <span className="text-xs font-mono px-1" style={{ color: 'var(--color-ink-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <Link
                href={buildInquiriesHref({ q, status, payment, sort, page: page + 1 })}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.97]"
                style={{ ...selectStyle, pointerEvents: page >= totalPages ? 'none' : undefined, opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
