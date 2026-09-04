import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/actions/settings'
import { formatDate, formatKWD, orderSummary } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { derivePaymentStatus } from '@/lib/payments'
import OrderStatusActions from './OrderStatusActions'
import OrderPaymentMenu from './OrderPaymentMenu'
import MobileOrderList from './MobileOrderList'
import AnimatedCardList from './AnimatedCardList'
import ViewToggle from './ViewToggle'
import Link from 'next/link'
import type { OrderStatus, WhatsAppTemplates } from '@/lib/supabase/types'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'

const BASE_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'delivered', label: 'Delivered' },
]

const CANCELLED_COLUMN: { status: OrderStatus; label: string } = {
  status: 'cancelled',
  label: 'Cancelled',
}

type PaymentFilter = 'all' | 'unpaid' | 'partial' | 'paid'

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
]

// Kanban cards are much taller than a table row, so a column reaching a couple
// dozen cards already reads as "too long" well before the table's page size would.
const PAGE_SIZE = 12

async function getOrdersForColumn(status: OrderStatus, payment: PaymentFilter, page: number) {
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select(
      `
      id, status, final_price, delivery_type, created_at, tracking_token,
      inquiry:inquiries!inner (
        id, customer_name, customer_phone, payment_method, event_date,
        pickup_time, occasion, theme, message_on_cake,
        allergen_nut_free, allergen_gluten_free, allergen_dairy_free, allergen_egg_free,
        allergen_halal, allergen_raw_sugar, allergen_other,
        admin_price, deposit_amount, amount_paid, fully_paid,
        items:inquiry_items(*)
      )
    `,
      { count: 'exact' }
    )
    .eq('status', status)
    .order('created_at', { ascending: false })

  // Filters on an embedded resource (`inquiry.payment_status`, the same generated
  // column the table view's `?payment=` reads) require the relation above to be an
  // inner join — see the `pastOrderCount` query in the order detail page for the
  // same pattern.
  if (payment !== 'all') {
    query = query.eq('inquiry.payment_status', payment)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(`Orders: failed to load ${status} orders — ${error.message}`)
  return { data: data ?? [], count: count ?? 0 }
}

// Builds a board-view URL carrying every param explicitly, so a column's own
// Prev/Next never resets the other columns' pages, the payment filter, or the
// cancelled toggle.
function buildBoardHref({
  cancelled,
  payment,
  confirmedPage,
  deliveredPage,
  cancelledPage,
}: {
  cancelled: boolean
  payment: PaymentFilter
  confirmedPage: number
  deliveredPage: number
  cancelledPage: number
}) {
  const sp = new URLSearchParams()
  sp.set('view', 'board')
  if (cancelled) sp.set('cancelled', '1')
  if (payment !== 'all') sp.set('payment', payment)
  if (confirmedPage > 1) sp.set('confirmedPage', String(confirmedPage))
  if (deliveredPage > 1) sp.set('deliveredPage', String(deliveredPage))
  if (cancelled && cancelledPage > 1) sp.set('cancelledPage', String(cancelledPage))
  return `/admin/orders?${sp.toString()}`
}

/**
 * Board (Kanban) view of the merged Orders section — `/admin/orders?view=board`.
 * Queries the `orders` table directly (confirmed/delivered, plus cancelled via
 * its own `?cancelled=1` toggle), independent of the table view's filter params.
 * Each column paginates and filters by payment status independently, since
 * columns can have wildly different counts.
 */
export default async function OrderKanbanBoard({
  showCancelled,
  payment,
  confirmedPage,
  deliveredPage,
  cancelledPage,
}: {
  showCancelled: boolean
  payment: PaymentFilter
  confirmedPage: number
  deliveredPage: number
  cancelledPage: number
}) {
  const columns = showCancelled ? [...BASE_COLUMNS, CANCELLED_COLUMN] : BASE_COLUMNS
  const pageByStatus: Record<OrderStatus, number> = {
    confirmed: confirmedPage,
    delivered: deliveredPage,
    cancelled: cancelledPage,
  }

  const [columnResults, settingsResult] = await Promise.all([
    Promise.all(columns.map((col) => getOrdersForColumn(col.status, payment, pageByStatus[col.status]))),
    getSettings(['whatsapp_templates']),
  ])
  if (settingsResult.error) throw new Error(`Orders: failed to load settings — ${settingsResult.error}`)
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined

  const byStatus = columns.reduce(
    (acc, col, i) => {
      acc[col.status] = columnResults[i]
      return acc
    },
    {} as Record<OrderStatus, (typeof columnResults)[number]>
  )
  const totalCount = columns.reduce((sum, col) => sum + (byStatus[col.status]?.count ?? 0), 0)
  const allOrders = columns.flatMap((col) => byStatus[col.status]?.data ?? [])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Orders"
        subtitle={`${totalCount} ${showCancelled ? 'total' : 'active'}`}
        action={
          <div className="flex items-center gap-2">
            <ViewToggle view="board" />
            <Link
              href={buildBoardHref({
                cancelled: !showCancelled,
                payment,
                confirmedPage,
                deliveredPage,
                cancelledPage,
              })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={
                showCancelled
                  ? { backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)', borderColor: 'transparent' }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }
              }
            >
              {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
            </Link>
          </div>
        }
      />

      {/* Payment filter — same three-way split as the table view's ?payment= */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {PAYMENT_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={buildBoardHref({
              cancelled: showCancelled,
              payment: opt.value,
              confirmedPage: 1,
              deliveredPage: 1,
              cancelledPage: 1,
            })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={
              payment === opt.value
                ? { backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)', borderColor: 'transparent' }
                : { borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }
            }
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Mobile list — shown below md breakpoint */}
      <div className="block md:hidden -mx-4">
        <MobileOrderList
          orders={allOrders}
          templates={templates}
          pagination={columns.reduce(
            (acc, col) => {
              const { count } = byStatus[col.status] ?? { count: 0 }
              const page = pageByStatus[col.status]
              const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
              acc[col.status] = {
                page,
                totalPages,
                totalCount: count,
                prevHref: buildBoardHref({
                  cancelled: showCancelled,
                  payment,
                  confirmedPage: col.status === 'confirmed' ? page - 1 : confirmedPage,
                  deliveredPage: col.status === 'delivered' ? page - 1 : deliveredPage,
                  cancelledPage: col.status === 'cancelled' ? page - 1 : cancelledPage,
                }),
                nextHref: buildBoardHref({
                  cancelled: showCancelled,
                  payment,
                  confirmedPage: col.status === 'confirmed' ? page + 1 : confirmedPage,
                  deliveredPage: col.status === 'delivered' ? page + 1 : deliveredPage,
                  cancelledPage: col.status === 'cancelled' ? page + 1 : cancelledPage,
                }),
              }
              return acc
            },
            {} as Record<string, { page: number; totalPages: number; totalCount: number; prevHref: string; nextHref: string }>
          )}
        />
      </div>

      {/* Kanban — hidden on mobile, shown md and up */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ status, label }) => {
          const { data: columnOrders, count } = byStatus[status] ?? { data: [], count: 0 }
          const page = pageByStatus[status]
          const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

          return (
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
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div
                className="rounded-xl p-2 min-h-32 flex flex-col gap-2"
                style={{ backgroundColor: 'var(--color-surface-raised)' }}
              >
                <AnimatedCardList
                  items={columnOrders.map((order: any) => ({
                    id: order.id,
                    node: <OrderCard order={order} templates={templates} />,
                  }))}
                  empty={
                    <div className="flex-1 flex items-center justify-center py-8">
                      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>Empty</p>
                    </div>
                  }
                />
              </div>

              {/* Per-column pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-2 px-1">
                  <Link
                    href={buildBoardHref({
                      cancelled: showCancelled,
                      payment,
                      confirmedPage: status === 'confirmed' ? page - 1 : confirmedPage,
                      deliveredPage: status === 'delivered' ? page - 1 : deliveredPage,
                      cancelledPage: status === 'cancelled' ? page - 1 : cancelledPage,
                    })}
                    aria-disabled={page <= 1}
                    tabIndex={page <= 1 ? -1 : undefined}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border transition-all active:scale-[0.97]"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-ink-muted)',
                      pointerEvents: page <= 1 ? 'none' : undefined,
                      opacity: page <= 1 ? 0.5 : 1,
                    }}
                  >
                    Prev
                  </Link>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                    {page} / {totalPages}
                  </span>
                  <Link
                    href={buildBoardHref({
                      cancelled: showCancelled,
                      payment,
                      confirmedPage: status === 'confirmed' ? page + 1 : confirmedPage,
                      deliveredPage: status === 'delivered' ? page + 1 : deliveredPage,
                      cancelledPage: status === 'cancelled' ? page + 1 : cancelledPage,
                    })}
                    aria-disabled={page >= totalPages}
                    tabIndex={page >= totalPages ? -1 : undefined}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border transition-all active:scale-[0.97]"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-ink-muted)',
                      pointerEvents: page >= totalPages ? 'none' : undefined,
                      opacity: page >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                  </Link>
                </div>
              )}
            </div>
          )
        })}
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

function OrderCard({ order, templates }: { order: any; templates?: WhatsAppTemplates }) {
  const inq = order.inquiry
  const days = inq?.event_date ? daysUntil(inq.event_date) : null
  const paymentStatus = inq ? derivePaymentStatus(inq.amount_paid, order.final_price, inq.fully_paid) : null

  return (
    <div
      className="rounded-lg border p-3 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
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
            {inq ? orderSummary(inq.items ?? []) : '—'}
          </p>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          {paymentStatus && <PaymentBadge status={paymentStatus} />}
          {inq?.id && (
            <OrderPaymentMenu
              inquiryId={inq.id}
              orderId={order.id}
              customerName={inq.customer_name ?? ''}
              customerPhone={inq.customer_phone ?? ''}
              orderTotal={Number(order.final_price)}
              amountPaid={Number(inq.amount_paid ?? 0)}
              defaultMethod={inq.payment_method || 'cash'}
              templates={templates}
            />
          )}
        </div>
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

      {order.status !== 'cancelled' && <OrderStatusActions orderId={order.id} currentStatus={order.status} />}
    </div>
  )
}
