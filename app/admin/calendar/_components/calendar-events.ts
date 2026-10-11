import type { InquiryItem, InquiryStatus, OrderStatus } from '@/lib/supabase/types'

/** Everything the detail modal needs, normalized from either an order or an inquiry. */
export type EventDetails = {
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
  /** For an order event this is the order's final_price; for an inquiry event it's admin_price. */
  price: string | null
  discount: string | null
  deliveryCharge: string | null
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

export type OrderEvent = BaseEvent & { kind: 'order'; status: OrderStatus; resource: EventDetails }
export type InquiryMadeEvent = BaseEvent & { kind: 'inquiry-made'; resource: EventDetails }
export type BlackoutEvent = BaseEvent & { kind: 'blackout'; resource: null }

export type CalendarEvent = OrderEvent | InquiryMadeEvent | BlackoutEvent
export type DetailEvent = OrderEvent | InquiryMadeEvent

// Solid (non-"-light") swatch per event kind/status — used wherever an event is
// reduced to a dot: agenda rows, and the mobile month grid's day cells and cards.
export function eventDotColor(event: CalendarEvent): string {
  switch (event.kind) {
    case 'blackout':
      return 'var(--color-danger)'
    case 'inquiry-made':
      return 'var(--color-calendar-marker)'
    case 'order':
      return event.status === 'delivered' ? 'var(--color-success)' : 'var(--color-info)'
  }
}
