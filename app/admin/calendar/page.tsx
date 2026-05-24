import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/PageHeader'
import CalendarView from './_components/CalendarView'
import type { Metadata } from 'next'

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

export default async function CalendarPage() {
  const orders = await getCalendarOrders()

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <PageHeader title="Calendar" subtitle="Order schedule" />
      <CalendarView orders={orders as any[]} />
    </div>
  )
}
