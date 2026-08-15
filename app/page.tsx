import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { LandingPage } from './_components/LandingPage'

export default async function RootPage() {
  const { businessInstagram } = await getBusinessContactSettings()

  return <LandingPage businessInstagram={businessInstagram} />
}
