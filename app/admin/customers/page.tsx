import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { Input, ResponsiveList } from '@/components/ui'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Customer } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Customers' }

type CustomerWithInquiries = Customer & {
  inquiries: Array<{ id: string; event_date: string }>
}

type EnrichedCustomer = Customer & {
  inquiry_count: number
  last_order_date: string | null
}

// Shared between the desktop row and mobile card in ResponsiveList below, so
// a future field only needs editing in one place instead of two markup copies.
function CustomerNameLine({ customer }: { customer: EnrichedCustomer }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
        {customer.name}
      </span>
      {customer.vip && (
        <span
          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
        >
          ★ VIP
        </span>
      )}
    </div>
  )
}

function CustomerStats({ customer }: { customer: EnrichedCustomer }) {
  return (
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
        {customer.inquiry_count} {customer.inquiry_count === 1 ? 'order' : 'orders'}
      </p>
      {customer.last_order_date && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          Last: {formatDate(customer.last_order_date)}
        </p>
      )}
    </div>
  )
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('customers')
    .select('*, inquiries(id, event_date)')
    .order('vip', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Customers: failed to load customers — ${error.message}`)

  const customers = (rows ?? []) as CustomerWithInquiries[]

  // Filter by name or phone
  const filtered = q.trim()
    ? customers.filter((c) => {
        const term = q.trim().toLowerCase()
        return (
          c.name?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term)
        )
      })
    : customers

  // Compute derived fields
  const enriched: EnrichedCustomer[] = filtered.map((c) => {
    const inquiries = c.inquiries ?? []
    const inquiry_count = inquiries.length
    const last_order_date =
      inquiries.length > 0
        ? inquiries.reduce((latest: string | null, inq) => {
            if (!latest) return inq.event_date
            return inq.event_date > latest ? inq.event_date : latest
          }, null)
        : null
    return { ...c, inquiry_count, last_order_date }
  })

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      <PageHeader title="Customers" />

      {/* Search */}
      <form className="mb-4">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or phone…"
          size="base"
          className="w-full md:w-72"
        />
      </form>

      {/* List */}
      {enriched.length === 0 ? (
        <div
          className="rounded-xl border overflow-hidden py-16 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {q.trim() ? `No customers match "${q}"` : 'No customers yet'}
          </p>
        </div>
      ) : (
        <ResponsiveList
          desktop={
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <ul>
                {enriched.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-[var(--color-surface-raised)]"
                      style={
                        i !== enriched.length - 1
                          ? { borderBottom: '1px solid var(--color-border)' }
                          : undefined
                      }
                    >
                      {/* VIP stripe */}
                      {c.vip && (
                        <span
                          className="w-0.5 self-stretch rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <CustomerNameLine customer={c} />
                        <p
                          className="text-xs mt-0.5"
                          style={{
                            color: 'var(--color-ink-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {c.phone}
                        </p>
                      </div>

                      <CustomerStats customer={c} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          }
          mobile={
            <div className="flex flex-col gap-3">
              {enriched.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/customers/${c.id}`}
                  className="rounded-xl border p-4 flex items-start justify-between gap-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                >
                  <div className="min-w-0">
                    <CustomerNameLine customer={c} />
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {c.phone}
                    </p>
                  </div>

                  <CustomerStats customer={c} />
                </Link>
              ))}
            </div>
          }
        />
      )}
    </div>
  )
}
