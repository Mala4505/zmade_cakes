import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/PageHeader'
import CalendarView from './_components/CalendarView'
import type { Metadata } from 'next'
import type { BlackoutDate } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Calendar' }

// Fields the event-detail modal needs from an inquiry, whether it arrives joined
// through an order or standalone as a pending inquiry.
const INQUIRY_DETAIL_FIELDS = `
  id, status, customer_name, customer_phone,
  cake_size, flavor, order_type, item_name, quantity, occasion, theme,
  special_requirements, message_on_cake,
  allergen_nut_free, allergen_dairy_free, allergen_egg_free, allergen_raw_sugar,
  admin_price, deposit_amount, amount_paid, fully_paid,
  event_date, pickup_time, delivery_type, created_at
`

async function getCalendarOrders() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`id, status, final_price, delivery_type, inquiry:inquiries (${INQUIRY_DETAIL_FIELDS})`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Calendar: failed to load orders — ${error.message}`)
  return data ?? []
}

// Inquiries not yet converted to orders: they render as tentative "Delivery" markers
// on their requested event_date plus "Inquiry made" markers on their created_at date.
async function getPendingInquiries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inquiries')
    .select(INQUIRY_DETAIL_FIELDS)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Calendar: failed to load inquiries — ${error.message}`)
  return data ?? []
}

async function getBlackoutDates() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blackout_dates')
    .select('id, date_from, date_to, reason')
    .order('date_from')
  if (error) throw new Error(`Calendar: failed to load blackout dates — ${error.message}`)
  return (data ?? []) as Pick<BlackoutDate, 'id' | 'date_from' | 'date_to' | 'reason'>[]
}

export default async function CalendarPage() {
  const [orders, inquiries, blackouts] = await Promise.all([
    getCalendarOrders(),
    getPendingInquiries(),
    getBlackoutDates(),
  ])

  // Per-day delivery workload: confirmed orders plus tentative inquiry deliveries.
  const deliveryCountByDate: Record<string, number> = {}
  for (const o of orders as any[]) {
    const d = o.inquiry?.event_date
    if (d) deliveryCountByDate[d] = (deliveryCountByDate[d] ?? 0) + 1
  }
  for (const inq of inquiries as any[]) {
    const d = inq.event_date
    if (d) deliveryCountByDate[d] = (deliveryCountByDate[d] ?? 0) + 1
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <PageHeader title="Calendar" subtitle="Order schedule" />
      <CalendarView
        orders={orders as any[]}
        inquiries={inquiries as any[]}
        blackouts={blackouts}
        deliveryCountByDate={deliveryCountByDate}
      />
    </div>
  )
}
