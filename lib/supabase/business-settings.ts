import { cache } from 'react'
import { createServiceClient } from './server'

export interface BusinessContactSettings {
  businessPhone: string
  businessInstagram: string
}

// Every customer-facing route (root layout + /confirm, /track, /order/success, /invoice,
// /my-orders, not-found) needs the business phone/Instagram handle for its header + WhatsApp
// CTAs. React's `cache()` dedupes this across the layout and the page it wraps within a single
// request/render pass — it does NOT persist across separate requests, so this stays a single
// pair of `business_settings` reads per customer page view instead of up to four.
export const getBusinessContactSettings = cache(async (): Promise<BusinessContactSettings> => {
  const supabase = createServiceClient()
  const [{ data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  return {
    businessPhone: (phoneRow?.value as string) ?? '',
    businessInstagram: (igRow?.value as string) ?? '',
  }
})
