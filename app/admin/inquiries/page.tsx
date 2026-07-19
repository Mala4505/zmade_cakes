import { createClient } from '@/lib/supabase/server'
import { formatDate, formatKWD } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { InquiryStatusSelect } from '@/components/admin/InquiryStatusSelect'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import Link from 'next/link'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import type { InquiryStatus } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Inquiries' }

type PaymentStatus = 'unpaid' | 'partial' | 'paid'

const STATUS_OPTIONS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_confirmation', label: 'Awaiting' },
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
  { value: 'created_at', label: 'Created ↓' },
  { value: 'price', label: 'Price ↓' },
]

async function getInquiries(status: string, payment: string, sort: string, q?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('inquiries')
    .select(
      'id, customer_name, customer_phone, cake_size, flavor, occasion, event_date, status, admin_price, advance_amount, advance_paid, fully_paid, payment_status, created_at, customer_id',
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
  }
  if (payment && payment !== 'all') {
    query = query.eq('payment_status', payment)
  }
  if (q?.trim()) {
    query = query.or(`customer_name.ilike.%${q.trim()}%,customer_phone.ilike.%${q.trim()}%`)
  }

  const { data, error, count } = await query.limit(200)
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

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; sort?: string; q?: string }>
}) {
  const { status = 'all', payment = 'all', sort = 'event_date', q } = await searchParams

  const [{ data: inquiries, count: totalCount }] = await Promise.all([
    getInquiries(status, payment, sort, q),
  ])

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
      </form>

      {/* Table */}
      <div
        className="rounded-xl border overflow-x-auto"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {inquiries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No inquiries found</p>
            {status === 'all' && !q && (
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
              <col style={{ width: 90 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <tbody>
              {inquiries.map((inq: any) => {
                const hasNoPrice = inq.admin_price === null || inq.admin_price === undefined
                const urgent = isUrgent(inq.event_date)
                const isReturning = inq.customer_id && (customerInquiryCounts[inq.customer_id] ?? 0) > 1
                const balance = inq.admin_price
                  ? balanceOwed(inq.admin_price, inq.advance_amount, inq.advance_paid, inq.fully_paid)
                  : null
                const isSettled = balance !== null && balance <= 0
                const paymentStatus = derivePaymentStatus(inq.fully_paid, inq.advance_paid, inq.advance_amount)

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
                          {inq.occasion || inq.cake_size} · {inq.flavor}
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

                    {/* Price */}
                    <td className="px-3 py-3 align-middle">
                      <Link href={`/admin/inquiries/${inq.id}`} className="block">
                        {hasNoPrice ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                            ⚠ No price
                          </span>
                        ) : (
                          <span
                            className="text-xs font-semibold font-mono"
                            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                          >
                            {formatKWD(inq.admin_price)}
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Balance */}
                    <td className="px-3 py-3 align-middle">
                      <Link href={`/admin/inquiries/${inq.id}`} className="block">
                        {isSettled ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                            Settled
                          </span>
                        ) : balance !== null ? (
                          <span
                            className="text-xs font-mono"
                            style={{ color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-mono)' }}
                          >
                            {formatKWD(balance.toFixed(3))}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>—</span>
                        )}
                      </Link>
                    </td>

                    {/* Status inline select */}
                    <td className="px-3 py-3 align-middle">
                      <InquiryStatusSelect inquiryId={inq.id} value={inq.status as InquiryStatus} />
                    </td>

                    {/* Payment status (read-only, computed) */}
                    <td className="px-3 py-3 align-middle pr-4">
                      <PaymentBadge status={paymentStatus} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {inquiries.length >= 200 && totalCount > 200 && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-ink-muted)' }}>
          Showing 200 of {totalCount} — refine your search
        </p>
      )}
    </div>
  )
}
