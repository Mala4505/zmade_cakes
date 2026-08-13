'use client'

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { ArrowSquareOut, CaretLeft, CaretRight } from '@phosphor-icons/react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, PaymentBadge } from '@/components/admin/StatusBadge'
import { derivePaymentStatus } from '@/lib/payments'
import { formatDate, formatTime, formatKWD, orderSummary } from '@/lib/utils'
import type { InquiryItem, InquiryStatus, OrderStatus } from '@/lib/supabase/types'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: enUS }),
  getDay,
  locales: { 'en-US': enUS },
})

// Only show "Inquiry made" markers for inquiries created in the last 60 days,
// so old creation dates don't clutter the calendar.
const INQUIRY_MADE_WINDOW_DAYS = 60

type EventKind = 'order' | 'inquiry-delivery' | 'inquiry-made' | 'blackout'

/** Everything the detail modal needs, normalized from either an order or an inquiry. */
type EventDetails = {
  /** Order id for order events, inquiry id for inquiry events. */
  linkId: string
  linkKind: 'order' | 'inquiry'
  status: OrderStatus | InquiryStatus
  customerName: string
  customerPhone: string
  items: InquiryItem[]
  nutFree: boolean
  dairyFree: boolean
  eggFree: boolean
  rawSugar: boolean
  eventDate: string
  pickupTime: string | null
  deliveryType: string
  price: string | null
  depositAmount: string | null
  amountPaid: string | null
  fullyPaid: boolean
}

type BaseEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: true
}

type OrderEvent = BaseEvent & { kind: 'order'; status: OrderStatus; resource: EventDetails }
type InquiryDeliveryEvent = BaseEvent & { kind: 'inquiry-delivery'; resource: EventDetails }
type InquiryMadeEvent = BaseEvent & { kind: 'inquiry-made'; resource: EventDetails }
type BlackoutEvent = BaseEvent & { kind: 'blackout'; resource: null }

type CalendarEvent = OrderEvent | InquiryDeliveryEvent | InquiryMadeEvent | BlackoutEvent
type DetailEvent = OrderEvent | InquiryDeliveryEvent | InquiryMadeEvent

function toDetails(inq: any, opts: { linkId: string; linkKind: 'order' | 'inquiry'; status: OrderStatus | InquiryStatus; deliveryType: string; price: unknown }): EventDetails {
  return {
    linkId: opts.linkId,
    linkKind: opts.linkKind,
    status: opts.status,
    customerName: inq.customer_name,
    customerPhone: inq.customer_phone,
    items: inq.items ?? [],
    nutFree: !!inq.allergen_nut_free,
    dairyFree: !!inq.allergen_dairy_free,
    eggFree: !!inq.allergen_egg_free,
    rawSugar: !!inq.allergen_raw_sugar,
    eventDate: inq.event_date,
    pickupTime: inq.pickup_time,
    deliveryType: opts.deliveryType,
    price: opts.price == null ? null : String(opts.price),
    depositAmount: inq.deposit_amount == null ? null : String(inq.deposit_amount),
    amountPaid: inq.amount_paid == null ? null : String(inq.amount_paid),
    fullyPaid: !!inq.fully_paid,
  }
}

function CustomToolbar({
  label,
  onView,
  onNavigate,
  view,
}: {
  label: string
  onView: (v: View) => void
  onNavigate: (action: string) => void
  view: View
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-ink-muted)' }}
          aria-label="Previous"
        >
          <CaretLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-secondary)' }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-ink-muted)' }}
          aria-label="Next"
        >
          <CaretRight size={16} />
        </button>
        <span
          className="ml-2 text-sm font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {(['month', 'week', 'day'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors"
            style={
              view === v
                ? { backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }
                : { color: 'var(--color-ink-muted)', backgroundColor: 'transparent' }
            }
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
      <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>
    </div>
  )
}

const DIETARY_CHIPS: { key: keyof Pick<EventDetails, 'nutFree' | 'dairyFree' | 'eggFree' | 'rawSugar'>; label: string }[] = [
  { key: 'nutFree', label: 'Nut-free' },
  { key: 'dairyFree', label: 'Dairy-free' },
  { key: 'eggFree', label: 'Egg-free' },
  { key: 'rawSugar', label: 'Raw sugar' },
]

function EventDetailBody({ event }: { event: DetailEvent }) {
  const r = event.resource
  const dietary = DIETARY_CHIPS.filter(({ key }) => r[key])

  return (
    <div className="flex flex-col gap-4">
      {/* Phone + status */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-sm"
          style={{ color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-mono)' }}
        >
          {r.customerPhone}
        </span>
        <StatusBadge status={r.status} context="admin" />
      </div>

      {/* Cake(s) */}
      <div
        className="flex flex-col gap-3 pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {r.items.map((item, i) => (
          <div
            key={item.id ?? i}
            className="flex flex-col gap-2.5"
            style={i > 0 ? { paddingTop: '0.625rem', borderTop: '1px dashed var(--color-border)' } : undefined}
          >
            <Row label={r.items.length > 1 ? `Item ${i + 1}` : 'Cake'}>
              {orderSummary([item])}
              {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
            </Row>
            <Row label="Theme">{item.theme || 'Normal'}</Row>
            {item.special_requirements && <Row label="Details">{item.special_requirements}</Row>}
            {item.message_on_cake && <Row label="Message on cake">&ldquo;{item.message_on_cake}&rdquo;</Row>}
          </div>
        ))}
        {dietary.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dietary.map(({ key, label }) => (
              <span
                key={key}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div
        className="flex flex-col gap-2.5 pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Row label="Event date">
          {formatDate(r.eventDate)}
          {r.pickupTime ? ` at ${formatTime(r.pickupTime)}` : ''}
        </Row>
        <Row label="Fulfilment">{r.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}</Row>
      </div>

      {/* Payment */}
      <div
        className="flex items-center justify-between gap-2 pt-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
          >
            {formatKWD(r.price)}
          </span>
          {r.depositAmount != null && (
            <span className="text-xs" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
              deposit {formatKWD(r.depositAmount)}
            </span>
          )}
        </div>
        <PaymentBadge status={derivePaymentStatus(r.fullyPaid, r.amountPaid)} />
      </div>
    </div>
  )
}

function DateCellWrapper({
  children,
  value,
  deliveryCountByDate,
}: {
  children: React.ReactNode
  value: Date
  deliveryCountByDate: Record<string, number>
}) {
  const dateStr = format(value, 'yyyy-MM-dd')
  const count = deliveryCountByDate[dateStr]
  return (
    <div className="relative w-full h-full">
      {children}
      {count > 0 && (
        <span
          className="absolute bottom-1 right-1 text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)', pointerEvents: 'none' }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

// Custom event content — flavor leads so it survives the single-line ellipsis
// truncation react-big-calendar applies to month-view event pills.
function EventContent({ event }: { event: CalendarEvent }) {
  if (event.kind === 'blackout' || event.kind === 'inquiry-made') {
    return <>{event.title}</>
  }
  const r = event.resource
  return (
    <>
      {event.kind === 'inquiry-delivery' && '? '}
      <strong className="font-semibold">
        {orderSummary(r.items)}
      </strong>
      <span className="opacity-80"> · {r.customerName}</span>
    </>
  )
}

const LEGEND: { label: string; style: React.CSSProperties }[] = [
  { label: 'Order', style: { backgroundColor: 'var(--color-teal)' } },
  { label: 'Dispatched', style: { backgroundColor: 'var(--color-success)' } },
  {
    label: 'Inquiry delivery (tentative)',
    style: { backgroundColor: 'var(--color-warning-light)', border: '1px dashed var(--color-warning)' },
  },
  {
    label: 'Inquiry made',
    style: { backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)' },
  },
  {
    label: 'Unavailable',
    style: { backgroundColor: 'var(--color-danger-light)', border: '1px solid var(--color-danger)' },
  },
]

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      {LEGEND.map(({ label, style }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={style} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-ink-muted)' }}>
            {label}
          </span>
        </span>
      ))}
    </div>
  )
}

interface CalendarViewProps {
  orders: any[]
  inquiries: any[]
  blackouts: { id: string; date_from: string; date_to: string; reason: string }[]
  deliveryCountByDate: Record<string, number>
}

export default function CalendarView({ orders, inquiries, blackouts, deliveryCountByDate }: CalendarViewProps) {
  // `selected` is kept through the close animation; `detailOpen` drives the modal.
  const [selected, setSelected] = useState<DetailEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  const events = useMemo<CalendarEvent[]>(() => {
    const orderEvents: OrderEvent[] = orders
      .filter((o: any) => o.inquiry?.event_date)
      .map((order: any) => {
        const inq = order.inquiry
        const eventDate = parseISO(inq.event_date)
        return {
          id: order.id,
          kind: 'order' as const,
          title: `${orderSummary(inq.items ?? [])} · ${inq.customer_name}`,
          start: eventDate,
          end: eventDate,
          allDay: true as const,
          status: order.status as OrderStatus,
          resource: toDetails(inq, {
            linkId: order.id,
            linkKind: 'order',
            status: order.status as OrderStatus,
            deliveryType: order.delivery_type,
            price: order.final_price,
          }),
        }
      })

    const pendingWithDate = inquiries.filter((inq: any) => inq.event_date)

    const inquiryDeliveryEvents: InquiryDeliveryEvent[] = pendingWithDate.map((inq: any) => {
      const eventDate = parseISO(inq.event_date)
      return {
        id: `inquiry-delivery-${inq.id}`,
        kind: 'inquiry-delivery' as const,
        title: `? ${orderSummary(inq.items ?? [])} · ${inq.customer_name}`,
        start: eventDate,
        end: eventDate,
        allDay: true as const,
        resource: toDetails(inq, {
          linkId: inq.id,
          linkKind: 'inquiry',
          status: inq.status as InquiryStatus,
          deliveryType: inq.delivery_type,
          price: inq.admin_price,
        }),
      }
    })

    const madeCutoff = new Date()
    madeCutoff.setDate(madeCutoff.getDate() - INQUIRY_MADE_WINDOW_DAYS)

    const inquiryMadeEvents: InquiryMadeEvent[] = inquiries
      .filter((inq: any) => inq.created_at && parseISO(inq.created_at) >= madeCutoff)
      .map((inq: any) => {
        const createdDate = parseISO(inq.created_at)
        return {
          id: `inquiry-made-${inq.id}`,
          kind: 'inquiry-made' as const,
          title: `Inquiry · ${inq.customer_name}`,
          start: createdDate,
          end: createdDate,
          allDay: true as const,
          resource: toDetails(inq, {
            linkId: inq.id,
            linkKind: 'inquiry',
            status: inq.status as InquiryStatus,
            deliveryType: inq.delivery_type,
            price: inq.admin_price,
          }),
        }
      })

    const blackoutEvents: BlackoutEvent[] = blackouts.map((b) => ({
      id: `blackout-${b.id}`,
      kind: 'blackout' as const,
      title: b.reason || 'Unavailable',
      start: parseISO(b.date_from),
      end: parseISO(b.date_to),
      allDay: true as const,
      resource: null,
    }))

    return [...blackoutEvents, ...orderEvents, ...inquiryDeliveryEvents, ...inquiryMadeEvents]
  }, [orders, inquiries, blackouts])

  function eventPropGetter(event: CalendarEvent) {
    const base: React.CSSProperties = {
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      padding: '3px 7px',
      fontSize: '12px',
      fontWeight: 500,
    }
    switch (event.kind) {
      case 'blackout':
        return {
          style: {
            ...base,
            backgroundColor: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
            opacity: 0.85,
            cursor: 'default',
          },
        }
      case 'inquiry-delivery':
        return {
          style: {
            ...base,
            backgroundColor: 'var(--color-warning-light)',
            color: 'var(--color-warning)',
            border: '1px dashed var(--color-warning)',
          },
        }
      case 'inquiry-made':
        return {
          style: {
            ...base,
            backgroundColor: 'var(--color-surface-raised)',
            color: 'var(--color-ink-muted)',
            fontSize: '11px',
          },
        }
      case 'order':
        if (event.status === 'delivered') {
          return { style: { ...base, backgroundColor: 'var(--color-success)', color: 'var(--color-cream)' } }
        }
        return { style: { ...base, backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' } }
    }
  }

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Calendar */}
      <div
        className="flex-1 rounded-xl border overflow-hidden flex flex-col"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 560,
        }}
      >
        <CustomToolbar
          label={format(date, view === 'month' ? 'MMMM yyyy' : view === 'week' ? "MMM d 'week'" : 'EEEE, MMM d')}
          onView={setView}
          onNavigate={(action) => {
            const d = new Date(date)
            if (action === 'TODAY') { setDate(new Date()); return }
            if (action === 'PREV') {
              if (view === 'month') d.setMonth(d.getMonth() - 1)
              else if (view === 'week') d.setDate(d.getDate() - 7)
              else d.setDate(d.getDate() - 1)
            }
            if (action === 'NEXT') {
              if (view === 'month') d.setMonth(d.getMonth() + 1)
              else if (view === 'week') d.setDate(d.getDate() + 7)
              else d.setDate(d.getDate() + 1)
            }
            setDate(d)
          }}
          view={view}
        />
        <div className="flex-1 min-h-0 flex flex-col">
          <Calendar
            className="flex-1 min-h-0"
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            views={['month', 'week', 'day']}
            eventPropGetter={eventPropGetter as any}
            onSelectEvent={(event) => {
              const e = event as CalendarEvent
              if (e.kind === 'blackout') return
              setSelected(e)
              setDetailOpen(true)
            }}
            components={{
              dateCellWrapper: ({ children, value }: any) => (
                <DateCellWrapper value={value} deliveryCountByDate={deliveryCountByDate} children={children} />
              ),
              event: ({ event }: { event: CalendarEvent }) => <EventContent event={event} />,
            }}
            popup
            toolbar={false}
          />
        </div>
      </div>

      <Legend />

      {/* Event detail modal — portals to document.body, so react-big-calendar's
          overflow:hidden containers can't clip it. */}
      <Modal
        open={detailOpen && selected != null}
        onClose={() => setDetailOpen(false)}
        title={selected?.resource.customerName ?? ''}
        size="sm"
        footer={
          selected && (
            <Link
              href={
                selected.resource.linkKind === 'order'
                  ? `/admin/orders/${selected.resource.linkId}`
                  : `/admin/inquiries/${selected.resource.linkId}`
              }
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-teal-deep)]"
              style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
            >
              {selected.resource.linkKind === 'order' ? 'Open order' : 'Open inquiry'}
              <ArrowSquareOut size={13} weight="bold" />
            </Link>
          )
        }
      >
        {selected && <EventDetailBody event={selected} />}
      </Modal>
    </div>
  )
}
