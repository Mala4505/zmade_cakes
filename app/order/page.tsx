import { createServiceClient } from '@/lib/supabase/server'
import OrderForm from './_components/OrderForm'

export default async function OrderPage() {
  const supabase = createServiceClient()

  const [flavorsRes, sizesRes, occasionsRes, blackoutsRes, phoneRow] = await Promise.all([
    supabase
      .from('flavor_options')
      .select('id, name, theme_available, prices:flavor_size_prices(size_id)')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('size_options').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('occasion_options').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('blackout_dates').select('id, date_from, date_to, reason').order('date_from'),
    supabase.from('business_settings').select('value').eq('key', 'min_lead_days').single(),
  ])

  const fetchResults = {
    flavors: flavorsRes,
    sizes: sizesRes,
    occasions: occasionsRes,
    'blackout dates': blackoutsRes,
  }
  for (const [name, res] of Object.entries(fetchResults)) {
    if (res.error) throw new Error(`Order form: failed to load ${name} — ${res.error.message}`)
  }

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
