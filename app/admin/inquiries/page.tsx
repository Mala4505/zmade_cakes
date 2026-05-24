import { createClient } from '@/lib/supabase/server'
import { formatDate, formatKWD } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge, PriorityBadge } from '@/components/admin/StatusBadge'
import Link from 'next/link'
import { Plus } from '@phosphor-icons/react/dist/ssr'
import InquiryStatusTabs from './_components/InquiryStatusTabs'
import type { Metadata } from 'next'
import type { InquiryStatus } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Inquiries' }

const STATUSES: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_confirmation', label: 'Awaiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'Making' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

async function getInquiries(status: string) {
  const supabase = await createClient()

  let query = supabase
    .from('inquiries')
    .select('id, customer_name, customer_phone, cake_size, flavor, occasion, event_date, status, priority, admin_price, confirmation_token, customer_confirmed, created_at')
    .order('priority', { ascending: false })
    .order('event_date', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status as InquiryStatus)
  }

  const { data, error } = await query.limit(100)
  if (error) return []
  return data ?? []
}

async function getStatusCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inquiries')
    .select('status')
    .not('status', 'is', null)

  if (!data) return {}
  const counts: Record<string, number> = { all: data.length }
  data.forEach((row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  })
  return counts
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
  const [inquiries, statusCounts] = await Promise.all([
    getInquiries(status),
    getStatusCounts(),
  ])

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

      {/* Status tabs */}
      <InquiryStatusTabs tabs={STATUSES} activeStatus={status} counts={statusCounts} />

      {/* List */}
      <div
        className="mt-4 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {inquiries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              No inquiries found
            </p>
            {status === 'all' && (
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
          <ul>
            {inquiries.map((inq: any, i: number) => (
              <li key={inq.id}>
                <Link
                  href={`/admin/inquiries/${inq.id}`}
                  className="flex items-start gap-3 px-4 py-4 transition-colors"
                  style={
                    i !== inquiries.length - 1
                      ? { borderBottom: '1px solid var(--color-border)' }
                      : undefined
                  }
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  {/* Priority stripe on top on mobile, left on desktop */}
                  {inq.priority > 0 && (
                    <span
                      className="hidden md:block w-0.5 self-stretch rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          inq.priority === 2
                            ? 'var(--color-danger)'
                            : 'var(--color-warning)',
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {inq.customer_name}
                      </span>
                      {inq.priority > 0 && <PriorityBadge priority={inq.priority} />}
                    </div>

                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--color-ink-muted)' }}
                    >
                      {inq.cake_size} · {inq.flavor}
                      {inq.occasion ? ` · ${inq.occasion}` : ''}
                    </p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className="text-xs font-mono"
                        style={{
                          color: 'var(--color-ink-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatDate(inq.event_date)}
                      </span>
                      {inq.admin_price && (
                        <span
                          className="text-xs font-mono"
                          style={{
                            color: 'var(--color-ink)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {formatKWD(inq.admin_price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={inq.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
