import { getOptions } from '@/lib/actions/options'
import { getSettings, getBlackouts } from '@/lib/actions/settings'
import { PageHeader } from '@/components/admin/PageHeader'
import InquiryForm from '@/app/admin/inquiries/_components/InquiryForm'
import { toPrefillItems } from '@/app/admin/inquiries/_components/CustomerHistoryPanel'
import { createClient } from '@/lib/supabase/server'
import { tokenSchema } from '@/lib/validations/inquiry'
import type { Metadata } from 'next'
import type { InquiryItem } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'New Order' }

interface Props {
  searchParams: Promise<{ from?: string }>
}

export default async function NewOrderPage({ searchParams }: Props) {
  const { from } = await searchParams

  const [flavors, sizes, occasions, items, settingsResult, blackoutsResult] = await Promise.all([
    getOptions('flavor_options'),
    getOptions('size_options'),
    getOptions('occasion_options'),
    getOptions('item_options'),
    getSettings(['min_lead_days', 'pricing_matrix', 'min_price_guard', 'rush_multiplier']),
    getBlackouts(),
  ])

  const fetchResults = {
    flavors,
    sizes,
    occasions,
    items,
    settings: settingsResult,
    'blackout dates': blackoutsResult,
  }
  for (const [name, res] of Object.entries(fetchResults)) {
    if (res.error) throw new Error(`New Order: failed to load ${name} — ${res.error}`)
  }

  const minLeadDays = parseInt((settingsResult.data?.min_lead_days as string) ?? '3')
  const pricingMatrix = (settingsResult.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsResult.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsResult.data?.rush_multiplier ?? 1.3)

  // "Repeat this order" entry point (order detail page / customer profile ->
  // ?from=<inquiryId>). A convenience prefill, not a hard dependency — an invalid,
  // missing, or unmatched id just falls through to the normal empty-form page rather
  // than erroring or 404ing.
  let prefillFrom: { customer_name: string; customer_phone: string; items: ReturnType<typeof toPrefillItems> } | undefined
  if (from && tokenSchema.safeParse(from).success) {
    const supabase = await createClient()
    const { data: sourceInquiry } = await supabase
      .from('inquiries')
      .select('customer_name, customer_phone, items:inquiry_items(*)')
      .eq('id', from)
      .maybeSingle()

    if (sourceInquiry) {
      prefillFrom = {
        customer_name: sourceInquiry.customer_name,
        customer_phone: sourceInquiry.customer_phone,
        items: toPrefillItems((sourceInquiry.items ?? []) as InquiryItem[]),
      }
    }
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader
        title="New Order"
        subtitle="Fill in the customer's order details"
        backHref="/admin/orders"
        backLabel="Orders"
      />

      <InquiryForm
        options={{
          flavors: flavors.data ?? [],
          sizes: sizes.data ?? [],
          occasions: occasions.data ?? [],
          items: items.data ?? [],
        }}
        minLeadDays={minLeadDays}
        blackouts={blackoutsResult.data ?? []}
        pricingMatrix={pricingMatrix}
        minPriceGuard={minPriceGuard}
        rushMultiplier={rushMultiplier}
        prefillFrom={prefillFrom}
      />
    </div>
  )
}
