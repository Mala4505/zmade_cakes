import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import OperatingRulesForm from './_components/OperatingRulesForm'

export const metadata: Metadata = { title: 'Operating Rules' }

export default async function OperatingRulesPage() {
  const result = await getSettings(['min_lead_days'])
  const leadDays = parseInt(result.data?.min_lead_days as string) || 3

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Operating Rules" subtitle="Set minimum booking requirements" />
      <OperatingRulesForm initialLeadDays={leadDays} />
    </div>
  )
}
