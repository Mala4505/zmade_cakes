import { createServiceClient } from '@/lib/supabase/server'
import OrderForm from './_components/OrderForm'

export default async function OrderPage() {
  const supabase = createServiceClient()

  const [flavorsRes, sizesRes, occasionsRes, blackoutsRes, phoneRow] = await Promise.all([
    supabase.from('flavor_options').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('size_options').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('occasion_options').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('blackout_dates').select('id, date_from, date_to, reason').order('date_from'),
    supabase.from('business_settings').select('value').eq('key', 'min_lead_days').single(),
  ])

  const minLeadDays = parseInt((phoneRow.data?.value as string) ?? '3')

  return (
    <OrderForm
      flavors={flavorsRes.data ?? []}
      sizes={sizesRes.data ?? []}
      occasions={occasionsRes.data ?? []}
      blackouts={(blackoutsRes.data ?? []) as { id: string; date_from: string; date_to: string; reason: string }[]}
      minLeadDays={minLeadDays}
    />
  )
}
