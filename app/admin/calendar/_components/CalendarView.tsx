'use client'

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { X, ArrowSquareOut, CaretLeft, CaretRight } from '@phosphor-icons/react'
import Link from 'next/link'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatDate, formatTime, formatKWD } from '@/lib/utils'
import type { OrderStatus } from '@/lib/supabase/types'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: enUS }),
  getDay,
  locales: { 'en-US': enUS },
})

type OrderResource = {
  orderId: string
  customerName: string
  customerPhone: string
  cakeSize: string
  flavor: string
  occasion: string
  eventDate: string
  pickupTime: string | null
  status: OrderStatus
  deliveryType: string
  finalPrice: string
}

type OrderEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  isDelivered: boolean
  resource: OrderResource
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

function EventPanel({
  event,
  onClose,
}: {
  event: OrderEvent
  onClose: () => void
}) {
  const r = event.resource
  return (
    <div
      className="w-72 rounded-xl border flex-shrink-0 self-start"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-ink)' }}>
            {r.customerName}
          </p>
          <p
            className="text-xs mt-0.5 font-mono"
            style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {r.customerPhone}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded transition-colors flex-shrink-0 hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-ink-muted)' }}
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Details */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        <Row label="Cake">
          {r.cakeSize} · {r.flavor}
          {r.occasion ? ` · ${r.occasion}` : ''}
        </Row>
        <Row label="Event Date">
          {formatDate(r.eventDate)}
          {r.pickupTime ? ` at ${formatTime(r.pickupTime)}` : ''}
        </Row>
        <Row label="Delivery">
          {r.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
        </Row>
        <div className="flex items-center gap-2 pt-0.5">
          <StatusBadge status={r.status} />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
          >
            {formatKWD(r.finalPrice)}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <Link
          href={`/admin/orders/${r.orderId}`}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          View Order <ArrowSquareOut size={13} weight="bold" />
        </Link>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>
    </div>
  )
}

export default function CalendarView({ orders }: { orders: any[] }) {
  const [selectedEvent, setSelectedEvent] = useState<OrderEvent | null>(null)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  const events = useMemo<OrderEvent[]>(() => {
    return orders
      .filter((o: any) => o.inquiry?.event_date)
      .map((order: any) => {
        const inq = order.inquiry
        const eventDate = parseISO(inq.event_date)
        return {
          id: order.id,
          title: `${inq.customer_name} · ${inq.cake_size}`,
          start: eventDate,
          end: eventDate,
          allDay: true,
          isDelivered: order.status === 'delivered',
          resource: {
            orderId: order.id,
            customerName: inq.customer_name,
            customerPhone: inq.customer_phone,
            cakeSize: inq.cake_size,
            flavor: inq.flavor,
            occasion: inq.occasion ?? '',
            eventDate: inq.event_date,
            pickupTime: inq.pickup_time,
            status: order.status as OrderStatus,
            deliveryType: order.delivery_type,
            finalPrice: order.final_price,
          },
        }
      })
  }, [orders])

  function eventPropGetter(event: OrderEvent) {
    const base = {
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    }
    if (event.isDelivered) {
      return { style: { ...base, backgroundColor: '#2e7d52', color: '#fff' } }
    }
    return { style: { ...base, backgroundColor: '#006860', color: '#fcf9f5' } }
  }

  return (
    <div className="flex gap-4 flex-1">
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
        <div className="flex-1">
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            views={['month', 'week', 'day']}
            eventPropGetter={eventPropGetter as any}
            onSelectEvent={(event) => setSelectedEvent(event as OrderEvent)}
            popup
            style={{ height: '100%' }}
            toolbar={false}
          />
        </div>
      </div>

      {/* Side panel */}
      {selectedEvent && (
        <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}
