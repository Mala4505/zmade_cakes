import { createServiceClient } from '@/lib/supabase/server'
import MyOrdersPage from './_components/MyOrdersClient'

export default async function MyOrdersServerPage() {
  const supabase = createServiceClient()
  const [{ data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  return (
    <MyOrdersPage
      businessPhone={(phoneRow?.value as string) ?? ''}
      businessInstagram={(igRow?.value as string) ?? ''}
    />
  )
}
