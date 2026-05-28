import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/PageHeader'
import CalendarView from './_components/CalendarView'
import type { Metadata } from 'next'
import type { BlackoutDate } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Calendar' }

async function getCalendarOrders() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select(`
      id, status, final_price, delivery_type,
      inquiry:inquiries (
        id, customer_name, customer_phone, cake_size, flavor,
        event_date, pickup_time, occasion
      )
    `)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  return data ?? []
}

async function getBlackoutDates() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blackout_dates')
    .select('id, date_from, date_to, reason')
    .order('date_from')
  return (data ?? []) as Pick<BlackoutDate, 'id' | 'date_from' | 'date_to' | 'reason'>[]
}

export default async function CalendarPage() {
  const [orders, blackouts] = await Promise.all([getCalendarOrders(), getBlackoutDates()])

  const orderCountByDate: Record<string, number> = {}
  for (const o of orders as any[]) {
    const d = o.inquiry?.event_date
    if (d) orderCountByDate[d] = (orderCountByDate[d] ?? 0) + 1
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <PageHeader title="Calendar" subtitle="Order schedule" />
      <CalendarView orders={orders as any[]} blackouts={blackouts} orderCountByDate={orderCountByDate} />
    </div>
  )
}
