import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import OperatingRulesForm from './_components/OperatingRulesForm'

export const metadata: Metadata = { title: 'Operating Rules' }

export default async function OperatingRulesPage() {
  const result = await getSettings(['min_lead_days'])
  const parsedLeadDays = parseInt(result.data?.min_lead_days as string)
  const leadDays = Number.isNaN(parsedLeadDays) ? 3 : parsedLeadDays

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Operating Rules" subtitle="Set minimum booking requirements" />
      <OperatingRulesForm initialLeadDays={leadDays} />
    </div>
  )
}
