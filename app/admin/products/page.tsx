import { getFlavorsWithPrices } from '@/lib/actions/products'
import { getAllOptions } from '@/lib/actions/options'
import { ProductsClient } from './_components/ProductsClient'

export const metadata = { title: 'Products — ZMade Admin' }

export default async function ProductsPage() {
  const [flavors, sizesResult] = await Promise.all([
    getFlavorsWithPrices(),
    getAllOptions('size_options'),
  ])
  return <ProductsClient initialFlavors={flavors} sizes={sizesResult.data ?? []} />
}
