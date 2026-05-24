import { createClient } from '@/lib/supabase/server'
import { formatDate, formatKWD } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge, PriorityBadge } from '@/components/admin/StatusBadge'
import OrderStatusActions from './_components/OrderStatusActions'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/lib/supabase/types'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Orders' }

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'in_progress', label: 'Making' },
  { status: 'ready', label: 'Ready' },
  { status: 'delivered', label: 'Delivered' },
]

async function getOrders() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select(`
      id, status, final_price, delivery_type, created_at, tracking_token,
      inquiry:inquiries (
        id, customer_name, customer_phone, cake_size, flavor, event_date,
        pickup_time, priority, occasion, theme, message_on_cake,
        allergen_nut_free, allergen_gluten_free, allergen_dairy_free, allergen_egg_free,
        allergen_halal, allergen_other,
        admin_price, advance_amount, advance_paid, balance_paid
      )
    `)
    .in('status', ['confirmed', 'in_progress', 'ready', 'delivered'])
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function OrdersPage() {
  const orders = await getOrders()

  const byStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = orders.filter((o: any) => o.status === col.status)
      return acc
    },
    {} as Record<OrderStatus, typeof orders>
  )

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Orders" subtitle={`${orders.length} active`} />

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map(({ status, label }) => (
          <div key={status} className="flex-none w-72 md:flex-1 min-w-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                {label}
              </span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  color: 'var(--color-ink-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {byStatus[status]?.length ?? 0}
              </span>
            </div>

            {/* Cards */}
            <div
              className="rounded-xl p-2 min-h-32 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--color-surface-raised)' }}
            >
              {(byStatus[status] ?? []).map((order: any) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {(byStatus[status] ?? []).length === 0 && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(dateStr)
  eventDate.setHours(0, 0, 0, 0)
  return Math.round((eventDate.getTime() - today.getTime()) / 86400000)
}

function OrderCard({ order }: { order: any }) {
  const inq = order.inquiry
  const priority = inq?.priority ?? 0
  const days = inq?.event_date ? daysUntil(inq.event_date) : null
  const balanceOwed =
    inq?.admin_price && inq?.advance_amount && !inq?.balance_paid
      ? (parseFloat(inq.admin_price) - parseFloat(inq.advance_amount)).toFixed(3)
      : null

  return (
    <div
      className="rounded-lg border p-3 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderTop: priority === 2
          ? '2px solid var(--color-danger)'
          : priority === 1
          ? '2px solid var(--color-warning)'
          : '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-sm font-semibold hover:underline"
            style={{ color: 'var(--color-ink)' }}
          >
            {inq?.customer_name ?? '—'}
          </Link>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
            {inq?.cake_size} · {inq?.flavor}
          </p>
        </div>
        {priority > 0 && <PriorityBadge priority={priority as 0 | 1 | 2} />}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-xs font-mono"
          style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {inq?.event_date ? formatDate(inq.event_date) : '—'}
        </span>
        {days !== null && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono"
            style={
              days < 0
                ? { backgroundColor: 'var(--color-danger)', color: '#fff' }
                : days === 0
                ? { backgroundColor: 'var(--color-danger)', color: '#fff' }
                : days <= 3
                ? { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }
                : { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' }
            }
          >
            {days < 0 ? 'OVERDUE' : days === 0 ? 'TODAY' : `${days}d`}
          </span>
        )}
        <span
          className="text-xs font-mono font-medium"
          style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
        >
          {formatKWD(order.final_price)}
        </span>
      </div>

      {inq && hasAllergens(inq) && (
        <div className="flex flex-wrap gap-1">
          {(Object.keys(ALLERGEN_LABELS) as Array<keyof typeof ALLERGEN_LABELS>).map((key) =>
            inq[key] ? (
              <span
                key={key}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
              >
                {ALLERGEN_LABELS[key]}
              </span>
            ) : null
          )}
          {inq.allergen_other && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
            >
              {inq.allergen_other.slice(0, 20)}
            </span>
          )}
        </div>
      )}

      {balanceOwed && (
        <div
          className="flex items-center gap-1.5 text-[11px] rounded px-2 py-1"
          style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
        >
          <span>Balance: KD {balanceOwed}</span>
        </div>
      )}

      <OrderStatusActions orderId={order.id} currentStatus={order.status} />
    </div>
  )
}
