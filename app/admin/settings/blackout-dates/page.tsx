import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getBlackouts } from '@/lib/actions/settings'
import BlackoutDatesManager from './_components/BlackoutDatesManager'

export const metadata: Metadata = { title: 'Blackout Dates' }

export default async function BlackoutDatesPage() {
  const result = await getBlackouts()

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Blackout Dates" subtitle="Block date ranges when you're unavailable" />
      <BlackoutDatesManager initialBlackouts={result.data ?? []} />
    </div>
  )
}
