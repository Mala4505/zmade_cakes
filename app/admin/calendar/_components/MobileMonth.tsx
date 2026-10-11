'use client'

import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { formatTime, orderSummary } from '@/lib/utils'
import { eventDotColor, type CalendarEvent, type DetailEvent, type BlackoutEvent } from './calendar-events'

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')
const weekOpts = { locale: enUS }

// Within a day: orders by pickup time (untimed last), then new-inquiry markers.
function sortDay(a: DetailEvent, b: DetailEvent): number {
  if (a.kind !== b.kind) return a.kind === 'order' ? -1 : 1
  const ta = a.resource.pickupTime ?? '99:99'
  const tb = b.resource.pickupTime ?? '99:99'
  return ta.localeCompare(tb)
}

const LEGEND = [
  { label: 'Order', color: 'var(--color-info)' },
  { label: 'Delivered', color: 'var(--color-success)' },
  { label: 'Inquiry', color: 'var(--color-calendar-marker)' },
  { label: 'Unavailable', color: 'var(--color-danger)' },
]

/**
 * Phone-only month view. react-big-calendar's month grid is unusable at ~47px
 * per column because it draws text pills; this grid draws only the date, a dot
 * per event kind and an order count, and lists the tapped day's events below as
 * full-width cards. Blackouts get a hatched cell plus one range card.
 */
export default function MobileMonth({
  events,
  onSelectEvent,
}: {
  events: CalendarEvent[]
  onSelectEvent: (event: DetailEvent) => void
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const today = startOfDay(new Date())

  const { byDay, blackoutsByDay } = useMemo(() => {
    const byDay = new Map<string, DetailEvent[]>()
    const blackoutsByDay = new Map<string, BlackoutEvent[]>()
    for (const e of events) {
      if (e.kind === 'blackout') {
        // date_to is inclusive (validated as "on or after start date").
        const span = Math.max(0, differenceInCalendarDays(e.end, e.start))
        for (let i = 0; i <= span; i++) {
          const k = dayKey(addDays(e.start, i))
          blackoutsByDay.set(k, [...(blackoutsByDay.get(k) ?? []), e])
        }
      } else {
        const k = dayKey(e.start)
        byDay.set(k, [...(byDay.get(k) ?? []), e])
      }
    }
    for (const list of byDay.values()) list.sort(sortDay)
    return { byDay, blackoutsByDay }
  }, [events])

  const days = useMemo(() => {
    const out: Date[] = []
    const last = endOfWeek(endOfMonth(month), weekOpts)
    for (let d = startOfWeek(month, weekOpts); d <= last; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  function goToMonth(next: Date) {
    const m = startOfMonth(next)
    setMonth(m)
    setSelected(isSameMonth(m, today) ? today : m)
  }

  function pickDay(d: Date) {
    setSelected(d)
    if (!isSameMonth(d, month)) setMonth(startOfMonth(d))
  }

  const selectedKey = dayKey(selected)
  const selectedEvents = byDay.get(selectedKey) ?? []
  const selectedBlackouts = blackoutsByDay.get(selectedKey) ?? []
  const orderCount = selectedEvents.filter((e) => e.kind === 'order').length

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border px-2 pt-2 pb-3 flex flex-col gap-2"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 pl-2">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-ink)' }} aria-live="polite">
            {format(month, 'MMMM')}{' '}
            <span className="text-sm font-normal" style={{ color: 'var(--color-ink-muted)' }}>
              {format(month, 'yyyy')}
            </span>
          </h2>
          <div className="flex items-center">
            <IconButton tone="muted" onClick={() => goToMonth(addMonths(month, -1))} aria-label="Previous month">
              <CaretLeft size={18} />
            </IconButton>
            <button
              type="button"
              onClick={() => goToMonth(today)}
              className="h-11 px-3 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--color-surface-raised)]"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              Today
            </button>
            <IconButton tone="muted" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Next month">
              <CaretRight size={18} />
            </IconButton>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5" role="group" aria-label={format(month, 'MMMM yyyy')}>
          {days.slice(0, 7).map((d) => (
            <div
              key={`h-${dayKey(d)}`}
              className="text-center text-[10px] font-semibold uppercase tracking-wider py-1"
              style={{ color: 'var(--color-ink-muted)' }}
              aria-hidden="true"
            >
              {format(d, 'EEE')}
            </div>
          ))}
          {days.map((d) => {
            const k = dayKey(d)
            const dayEvents = byDay.get(k) ?? []
            const blacked = blackoutsByDay.has(k)
            const inMonth = isSameMonth(d, month)
            const isSel = isSameDay(d, selected)
            const isToday = isSameDay(d, today)
            const orders = dayEvents.filter((e) => e.kind === 'order').length
            // One dot per distinct colour, so 3 confirmed orders read as one blue dot + the count.
            const colors = [...new Set(dayEvents.map(eventDotColor))].slice(0, 3)
            return (
              <button
                key={k}
                type="button"
                onClick={() => pickDay(d)}
                aria-pressed={isSel}
                aria-label={`${format(d, 'EEEE d MMMM')}${orders ? `, ${orders} ${orders === 1 ? 'order' : 'orders'}` : ''}${blacked ? ', unavailable' : ''}`}
                className="relative min-h-[46px] rounded-lg flex flex-col items-center pt-1.5 gap-1 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-teal)]"
                style={{
                  backgroundColor: isSel ? 'var(--color-teal)' : undefined,
                  backgroundImage:
                    blacked && !isSel
                      ? 'repeating-linear-gradient(135deg, var(--color-danger-light) 0 4px, transparent 4px 8px)'
                      : undefined,
                  color: isSel
                    ? 'var(--color-cream)'
                    : !inMonth
                      ? 'var(--color-border-strong)'
                      : isToday
                        ? 'var(--color-teal)'
                        : 'var(--color-ink-secondary)',
                  fontWeight: isToday || isSel ? 700 : 500,
                }}
              >
                <span>{format(d, 'd')}</span>
                <span className="flex gap-[3px] h-1.5" aria-hidden="true">
                  {colors.map((c) => (
                    <span
                      key={c}
                      className="w-[5px] h-[5px] rounded-full"
                      // On the teal selected cell the status colours lose contrast, so
                      // they go cream; the day list below carries the colour instead.
                      style={{
                        backgroundColor: isSel ? 'var(--color-cream)' : c,
                        opacity: inMonth ? 1 : 0.4,
                      }}
                    />
                  ))}
                </span>
                {orders > 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 right-1 text-[9px] font-semibold"
                    style={{ color: isSel ? 'var(--color-cream)' : 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {orders}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 pt-1">
          {LEGEND.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
              <span aria-hidden="true" className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Selected day */}
      <section className="flex flex-col gap-2" aria-label={`Events on ${format(selected, 'EEEE d MMMM')}`}>
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
            {format(selected, 'EEE d MMM')}
            {isSameDay(selected, today) && <span style={{ color: 'var(--color-teal)' }}> · Today</span>}
          </h3>
          {orderCount > 0 && (
            <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              {orderCount} {orderCount === 1 ? 'order' : 'orders'}
            </span>
          )}
        </div>

        {selectedBlackouts.map((b) => (
          <div
            key={b.id}
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-danger-light)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
              Unavailable · {b.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {isSameDay(b.start, b.end)
                ? format(b.start, 'EEE d MMM')
                : `${format(b.start, 'd MMM')} – ${format(b.end, 'd MMM')}`}
            </p>
          </div>
        ))}

        {selectedEvents.map((e) => (
          <DayCard key={e.id} event={e} onClick={() => onSelectEvent(e)} />
        ))}

        {selectedEvents.length === 0 && selectedBlackouts.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-ink-muted)' }}>
            Nothing booked. This day is free.
          </p>
        )}
      </section>
    </div>
  )
}

function DayCard({ event, onClick }: { event: DetailEvent; onClick: () => void }) {
  const r = event.resource
  const isInquiry = event.kind === 'inquiry-made'
  const delivered = event.kind === 'order' && event.status === 'delivered'
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 min-h-[56px] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-teal)]"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: isInquiry ? 'var(--color-calendar-marker-light)' : 'var(--color-surface)',
      }}
    >
      <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: eventDotColor(event) }} />
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold truncate"
          style={{ color: isInquiry ? 'var(--color-calendar-marker)' : 'var(--color-ink)' }}
        >
          {isInquiry ? 'New inquiry' : orderSummary(r.items)}
        </span>
        <span className="block text-xs truncate" style={{ color: 'var(--color-ink-muted)' }}>
          {r.customerName}
          {delivered ? ' · Delivered' : ''}
        </span>
      </span>
      {!isInquiry && (
        <span className="shrink-0 text-right">
          <span className="block text-xs" style={{ color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-mono)' }}>
            {r.pickupTime ? formatTime(r.pickupTime) : '—'}
          </span>
          <span className="block text-[10px]" style={{ color: 'var(--color-ink-muted)' }}>
            {r.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}
          </span>
        </span>
      )}
    </button>
  )
}
