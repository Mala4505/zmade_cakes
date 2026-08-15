import { createServiceClient } from '@/lib/supabase/server'
import OrderForm from './_components/OrderForm'

// Landing-page flavor names (app/_components/LandingPage.tsx) and this table's
// `name` column have drifted apart over time — different casing, some flavors
// only exist on one side. Resolve loosely instead of requiring an exact match,
// so a flavor card's "Order this cake" link still finds its flavor even when
// the wording isn't byte-identical. Returns undefined (leaving the field blank)
// rather than guessing wrong.
function normalizeFlavorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+cake$/, '')
}

function resolveFlavorName(param: string | undefined, flavors: { name: string }[]): string | undefined {
  if (!param) return undefined
  const target = normalizeFlavorName(param)
  if (!target) return undefined
  const targetWords = target.split(/\s+/).filter(Boolean)

  for (const f of flavors) {
    if (normalizeFlavorName(f.name) === target) return f.name
  }
  for (const f of flavors) {
    const candidate = normalizeFlavorName(f.name)
    if (candidate.startsWith(target) || target.startsWith(candidate)) return f.name
  }
  for (const f of flavors) {
    const candidate = normalizeFlavorName(f.name)
    if (targetWords.every(word => candidate.includes(word))) return f.name
  }
  return undefined
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ flavor?: string; type?: string }>
}) {
  const { flavor: flavorParam, type: typeParam } = await searchParams
  const supabase = createServiceClient()

  const [flavorsRes, sizesRes, occasionsRes, blackoutsRes, minLeadDaysRow] = await Promise.all([
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

  const minLeadDays = parseInt((minLeadDaysRow.data?.value as string) ?? '3')
  const resolvedFlavor = resolveFlavorName(flavorParam, flavorsRes.data ?? [])
  const matchedFlavor = (flavorsRes.data ?? []).find(f => f.name === resolvedFlavor)
  // Only honor "customize" (theme cake) when the resolved flavor actually supports it —
  // otherwise fall back to the normal cake type instead of pre-selecting a disabled option.
  const initialCakeType = typeParam === 'theme' && matchedFlavor?.theme_available ? 'theme' : undefined

  return (
    <OrderForm
      flavors={flavorsRes.data ?? []}
      sizes={sizesRes.data ?? []}
      occasions={occasionsRes.data ?? []}
      blackouts={(blackoutsRes.data ?? []) as { id: string; date_from: string; date_to: string; reason: string }[]}
      minLeadDays={minLeadDays}
      initialFlavor={resolvedFlavor}
      initialCakeType={initialCakeType}
    />
  )
}
