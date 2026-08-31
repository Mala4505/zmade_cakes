import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { Input } from '@/components/ui'
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
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {enriched.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              {q.trim() ? `No customers match "${q}"` : 'No customers yet'}
            </p>
          </div>
        ) : (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {c.name}
                      </span>
                      {c.vip && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                        >
                          ★ VIP
                        </span>
                      )}
                    </div>
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

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                      {c.inquiry_count} {c.inquiry_count === 1 ? 'order' : 'orders'}
                    </p>
                    {c.last_order_date && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                        Last: {formatDate(c.last_order_date)}
                      </p>
                    )}
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
