import Link from 'next/link'
import { formatDate, formatKWD } from '@/lib/utils'
import { PriorityBadge } from '@/components/admin/StatusBadge'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'

interface OrderInquiry {
  customer_name?: string | null
  cake_size?: string | null
  flavor?: string | null
  event_date?: string | null
  priority?: number | null
  admin_price?: string | number | null
  advance_amount?: string | number | null
  balance_paid?: boolean | null
  allergen_nut_free?: boolean | null
  allergen_gluten_free?: boolean | null
  allergen_dairy_free?: boolean | null
  allergen_egg_free?: boolean | null
  allergen_halal?: boolean | null
  allergen_other?: string | null
}

interface MobileOrder {
  id: string
  status: string
  final_price?: number | null
  inquiry?: OrderInquiry | null
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  in_progress: 'Making',
  ready: 'Ready',
  delivered: 'Delivered',
}

const STATUS_ORDER = ['confirmed', 'in_progress', 'ready', 'delivered']

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(dateStr)
  eventDate.setHours(0, 0, 0, 0)
  return Math.round((eventDate.getTime() - today.getTime()) / 86400000)
}

function MobileOrderCard({ order }: { order: MobileOrder }) {
  const inq = order.inquiry
  const priority = inq?.priority ?? 0
  const days = inq?.event_date ? daysUntil(inq.event_date) : null
  const balanceOwed =
    inq?.admin_price && inq?.advance_amount && !inq?.balance_paid
      ? (parseFloat(String(inq.admin_price)) - parseFloat(String(inq.advance_amount))).toFixed(3)
      : null

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="block rounded-xl border p-4 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', textDecoration: 'none' }}
    >
      {/* Name + priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
            {inq?.customer_name ?? '—'}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
            {[inq?.cake_size, inq?.flavor].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        {priority > 0 && <PriorityBadge priority={priority as 1 | 2} />}
      </div>

      {/* Date + countdown + price */}
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
              days <= 0
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

      {/* Allergen badges */}
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

      {/* Balance owed */}
      {balanceOwed && (
        <div
          className="flex items-center gap-1.5 text-[11px] rounded px-2 py-1"
          style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}
        >
          <span>Balance: KD {balanceOwed}</span>
        </div>
      )}
    </Link>
  )
}

export default function MobileOrderList({ orders }: { orders: MobileOrder[] }) {
  const grouped = STATUS_ORDER.reduce<Record<string, MobileOrder[]>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s)
    return acc
  }, {})

  return (
    <div className="flex flex-col">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (!group.length) return null
        return (
          <div key={status}>
            <div
              className="sticky top-14 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-ink-muted)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {STATUS_LABELS[status]} · {group.length}
            </div>
            <div className="flex flex-col gap-3 p-4">
              {group.map((order) => (
                <MobileOrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
