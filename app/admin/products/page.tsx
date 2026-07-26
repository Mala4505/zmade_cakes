import { getFlavorsWithPrices } from '@/lib/actions/products'
import { getAllOptions } from '@/lib/actions/options'
import { getSettings } from '@/lib/actions/settings'
import { ProductsClient } from './_components/ProductsClient'

export const metadata = { title: 'Products — ZMade Admin' }

export default async function ProductsPage() {
  const [flavors, sizesResult, itemsResult, settingsRes] = await Promise.all([
    getFlavorsWithPrices(),
    getAllOptions('size_options'),
    getAllOptions('item_options'),
    getSettings(['pricing_matrix', 'min_price_guard', 'rush_multiplier']),
  ])
  if (sizesResult.error) throw new Error(`Products: failed to load sizes — ${sizesResult.error}`)
  if (itemsResult.error) throw new Error(`Products: failed to load items — ${itemsResult.error}`)
  if (settingsRes.error) throw new Error(`Products: failed to load pricing — ${settingsRes.error}`)

  const pricingMatrix = (settingsRes.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsRes.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsRes.data?.rush_multiplier ?? 1.3)

  return (
    <ProductsClient
      initialFlavors={flavors}
      sizes={sizesResult.data ?? []}
      items={itemsResult.data ?? []}
      pricingMatrix={pricingMatrix}
      minPriceGuard={minPriceGuard}
      rushMultiplier={rushMultiplier}
    />
  )
}
