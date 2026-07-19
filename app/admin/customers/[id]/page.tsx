import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatKWD } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import Link from 'next/link'
import CustomerDetail from './_components/CustomerDetail'
import type { Metadata } from 'next'
import type { InquiryStatus } from '@/lib/supabase/types'

type InquiryRow = {
  id: string
  cake_size: string
  flavor: string
  occasion: string
  event_date: string
  status: InquiryStatus
  admin_price: string | null
  created_at: string
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('customers').select('name').eq('id', id).single()
  return { title: data?.name ? `${data.name} — Customer` : 'Customer' }
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) notFound()

  const { data: inquiries, error: inquiriesError } = await supabase
    .from('inquiries')
    .select('id, cake_size, flavor, occasion, event_date, status, admin_price, created_at')
    .eq('customer_id', id)
    .order('event_date', { ascending: false })

  if (inquiriesError) throw new Error(`Customer: failed to load order history — ${inquiriesError.message}`)

  const inquiryList = (inquiries ?? []) as InquiryRow[]

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <PageHeader
        title={customer.name}
        subtitle={customer.phone}
        backHref="/admin/customers"
        backLabel="Customers"
      />

      {/* Customer summary card */}
      <div
        className="rounded-xl border p-4 mb-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              {customer.name}
              {customer.vip && (
                <span
                  className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                >
                  ★ VIP
                </span>
              )}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {customer.phone}
            </p>
          </div>
          <p className="text-xs shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
            Customer since {formatDate(customer.created_at)}
          </p>
        </div>
        {customer.notes && (
          <p className="text-sm italic" style={{ color: 'var(--color-ink-secondary)' }}>
            "{customer.notes}"
          </p>
        )}
      </div>

      {/* Editable VIP + Notes */}
      <CustomerDetail
        customerId={customer.id}
        initialNotes={customer.notes ?? ''}
        initialVip={customer.vip ?? false}
      />

      {/* Inquiry history */}
      <div className="mt-6">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Order History ({inquiryList.length})
        </p>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {inquiryList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                No orders yet
              </p>
            </div>
          ) : (
            <ul>
              {inquiryList.map((inq, i) => (
                <li key={inq.id}>
                  <Link
                    href={`/admin/inquiries/${inq.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--color-surface-raised)]"
                    style={
                      i !== inquiryList.length - 1
                        ? { borderBottom: '1px solid var(--color-border)' }
                        : undefined
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                        {inq.cake_size} · {inq.flavor}
                        {inq.occasion ? ` · ${inq.occasion}` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span
                          className="text-xs"
                          style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          {formatDate(inq.event_date)}
                        </span>
                        {inq.admin_price && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                          >
                            {formatKWD(inq.admin_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={inq.status as InquiryStatus} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
