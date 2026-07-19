import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import { createClient } from '@/lib/supabase/server'
import PricingForm from './_components/PricingForm'

export const metadata: Metadata = { title: 'Pricing' }

export default async function PricingPage() {
  const supabase = await createClient()

  const [sizesRes, settingsRes] = await Promise.all([
    supabase
      .from('size_options')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order'),
    getSettings(['pricing_matrix', 'min_price_guard', 'rush_multiplier']),
  ])

  if (sizesRes.error) throw new Error(`Pricing: failed to load sizes — ${sizesRes.error.message}`)
  if (settingsRes.error) throw new Error(`Pricing: failed to load settings — ${settingsRes.error}`)

  const pricingMatrix = (settingsRes.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsRes.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsRes.data?.rush_multiplier ?? 1.3)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Pricing" subtitle="Configure base prices and rush multiplier" />
      <PricingForm
        sizes={sizesRes.data ?? []}
        initialMatrix={pricingMatrix}
        initialMinGuard={minPriceGuard}
        initialRushMultiplier={rushMultiplier}
      />
    </div>
  )
}
