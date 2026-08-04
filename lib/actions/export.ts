'use server'

import { createClient } from '@/lib/supabase/server'

export async function exportMonthlyOrdersCSV(year: number, month: number): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const from = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const to = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      final_price,
      delivery_type,
      delivery_charge,
      created_at,
      inquiry:inquiries(
        customer_name,
        customer_phone,
        cake_size,
        flavor,
        event_date,
        delivery_type
      )
    `)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z')
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }

  const header = 'Order ID,Customer,Phone,Cake Size,Flavor,Event Date,Delivery Type,Delivery Charge,Price,Status,Created At'
  const rows = (data ?? []).map((o: any) => {
    const inq = o.inquiry ?? {}
    return [
      o.id,
      inq.customer_name ?? '',
      inq.customer_phone ?? '',
      inq.cake_size ?? '',
      inq.flavor ?? '',
      inq.event_date ?? '',
      o.delivery_type ?? '',
      o.delivery_charge ?? '',
      o.final_price ?? '',
      o.status ?? '',
      o.created_at?.split('T')[0] ?? '',
    ].map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })

  return { data: [header, ...rows].join('\n'), error: null }
}
