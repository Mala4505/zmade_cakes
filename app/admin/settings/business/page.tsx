import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import BusinessInfoForm from './_components/BusinessInfoForm'

export const metadata: Metadata = { title: 'Business Info' }

export default async function BusinessInfoPage() {
  const result = await getSettings(['business_phone', 'business_instagram'])
  const phone = (result.data?.business_phone as string) ?? '96500000000'
  const instagram = (result.data?.business_instagram as string) ?? '@zmadecakes.q8'

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Business Info" subtitle="Update your contact details used in customer messages" />
      <div className="mt-6">
        <BusinessInfoForm initialPhone={phone} initialInstagram={instagram} />
      </div>
    </div>
  )
}
