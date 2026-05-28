import { getOptions } from '@/lib/actions/options'
import { getSettings, getBlackouts } from '@/lib/actions/settings'
import { PageHeader } from '@/components/admin/PageHeader'
import InquiryForm from '../_components/InquiryForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Inquiry' }

export default async function NewInquiryPage() {
  const [flavors, sizes, occasions, themes, decorations, settingsResult, blackoutsResult] = await Promise.all([
    getOptions('flavor_options'),
    getOptions('size_options'),
    getOptions('occasion_options'),
    getOptions('theme_options'),
    getOptions('decoration_style_options'),
    getSettings(['min_lead_days', 'pricing_matrix', 'min_price_guard', 'rush_multiplier']),
    getBlackouts(),
  ])

  const minLeadDays = parseInt((settingsResult.data?.min_lead_days as string) ?? '3')
  const pricingMatrix = (settingsResult.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsResult.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsResult.data?.rush_multiplier ?? 1.3)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader
        title="New Inquiry"
        subtitle="Fill in the customer's order details"
        backHref="/admin/inquiries"
        backLabel="Inquiries"
      />

      <InquiryForm
        options={{
          flavors: flavors.data ?? [],
          sizes: sizes.data ?? [],
          occasions: occasions.data ?? [],
          themes: themes.data ?? [],
          decorations: decorations.data ?? [],
        }}
        minLeadDays={minLeadDays}
        blackouts={blackoutsResult.data ?? []}
        pricingMatrix={pricingMatrix}
        minPriceGuard={minPriceGuard}
        rushMultiplier={rushMultiplier}
      />
    </div>
  )
}
