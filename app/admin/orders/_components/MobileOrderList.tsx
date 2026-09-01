import Link from 'next/link'
import { formatDate, formatKWD, orderSummary } from '@/lib/utils'
import AnimatedCardList from './AnimatedCardList'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { derivePaymentStatus } from '@/lib/payments'
import { hasAllergens, ALLERGEN_LABELS, type AllergenFlags, type InquiryItem, type OrderStatus, type WhatsAppTemplates } from '@/lib/supabase/types'
import OrderStatusActions from './OrderStatusActions'
import OrderPaymentMenu from './OrderPaymentMenu'

interface OrderInquiry {
  id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  payment_method?: string | null
  items?: InquiryItem[] | null
  event_date?: string | null
  admin_price?: string | number | null
  deposit_amount?: string | number | null
  amount_paid?: string | number | null
  fully_paid?: boolean | null
  allergen_nut_free?: boolean | null
  allergen_dairy_free?: boolean | null
  allergen_egg_free?: boolean | null
  allergen_raw_sugar?: boolean | null
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
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_ORDER = ['confirmed', 'delivered', 'cancelled']

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(dateStr)
  eventDate.setHours(0, 0, 0, 0)
  return Math.round((eventDate.getTime() - today.getTime()) / 86400000)
}

function MobileOrderCard({ order, templates }: { order: MobileOrder; templates?: WhatsAppTemplates }) {
  const inq = order.inquiry
  const days = inq?.event_date ? daysUntil(inq.event_date) : null
  const paymentStatus = inq
    ? derivePaymentStatus(inq.amount_paid ?? null, order.final_price ?? null, inq.fully_paid ?? false)
    : null

  return (
    <div
      className="relative rounded-xl border p-4 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Stretched link: makes the whole card tappable for navigation without
          nesting the status-action button inside an <a> (invalid HTML — a
          button can't be a descendant of a link — and it would also make the
          Link swallow the button's taps). OrderStatusActions is rendered as a
          sibling below with a higher z-index so it stays independently tappable. */}
      <Link
        href={`/admin/orders/${order.id}`}
        aria-label={`View order for ${inq?.customer_name ?? 'this order'}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2"
        style={{ textDecoration: 'none', ['--tw-ring-color' as string]: 'var(--color-teal-light)' }}
      />

      {/* Name + payment status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
            {inq?.customer_name ?? '—'}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
            {inq ? orderSummary(inq.items ?? []) : '—'}
          </p>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          {paymentStatus && <PaymentBadge status={paymentStatus} />}
          {inq?.id && (
            <div className="relative z-10">
              <OrderPaymentMenu
                inquiryId={inq.id}
                orderId={order.id}
                customerName={inq.customer_name ?? ''}
                customerPhone={inq.customer_phone ?? ''}
                orderTotal={Number(order.final_price ?? 0)}
                amountPaid={Number(inq.amount_paid ?? 0)}
                defaultMethod={inq.payment_method === 'wamd' ? 'wamd' : 'cash'}
                templates={templates}
              />
            </div>
          )}
        </div>
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
            {days === 0 ? 'TODAY' : `${days}d`}
          </span>
        )}
        <span
          className="text-xs font-mono font-medium"
          style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
        >
          {formatKWD(order.final_price?.toString())}
        </span>
      </div>

      {/* Allergen badges */}
      {inq && hasAllergens(inq as unknown as AllergenFlags) && (
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

      {/* Status action — sibling of the stretched Link, raised above it via
          z-index so it stays independently tappable (see comment above). */}
      {order.status !== 'cancelled' && (
        <div className="relative z-10">
          <OrderStatusActions orderId={order.id} currentStatus={order.status as OrderStatus} />
        </div>
      )}
    </div>
  )
}

export default function MobileOrderList({ orders, templates }: { orders: MobileOrder[]; templates?: WhatsAppTemplates }) {
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
              className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              style={{
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-ink-muted)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {STATUS_LABELS[status]} · {group.length}
            </div>
            <div className="flex flex-col gap-3 p-4">
              <AnimatedCardList
                items={group.map((order) => ({
                  id: order.id,
                  node: <MobileOrderCard order={order} templates={templates} />,
                }))}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
