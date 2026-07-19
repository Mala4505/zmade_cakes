import { getAllOptions } from '@/lib/actions/options'
import { PageHeader } from '@/components/admin/PageHeader'
import OptionsManager from './_components/OptionsManager'
import type { Metadata } from 'next'
import type { OptionTable } from '@/lib/validations/options'

export const metadata: Metadata = { title: 'Options' }

const OPTION_TYPES: { type: OptionTable; label: string }[] = [
  { type: 'occasion_options', label: 'Occasions' },
]

export default async function OptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type = 'occasion_options' } = await searchParams
  const activeType = OPTION_TYPES.find((t) => t.type === type)?.type ?? 'occasion_options'

  const result = await getAllOptions(activeType)
  if (result.error) throw new Error(`Options: failed to load ${activeType} — ${result.error}`)
  const options = result.data ?? []

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader title="Options Manager" subtitle="Manage the occasions offered on inquiry forms" />

      <OptionsManager
        optionTypes={OPTION_TYPES}
        activeType={activeType}
        options={options}
      />
    </div>
  )
}
