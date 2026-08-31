import type { Metadata } from 'next'
import { Navbar } from '@/components/public/Navbar'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Inquire About a Cake',
  description: `Submit a custom cake inquiry to ${BRAND_NAME}`,
}

export default async function OrderLayout({ children }: { children: React.ReactNode }) {
  const { businessPhone, businessInstagram } = await getBusinessContactSettings()

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar businessPhone={businessPhone} businessInstagram={businessInstagram} />
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
