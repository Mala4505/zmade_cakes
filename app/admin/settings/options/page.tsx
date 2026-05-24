import { getAllOptions } from '@/lib/actions/options'
import { PageHeader } from '@/components/admin/PageHeader'
import OptionsManager from './_components/OptionsManager'
import type { Metadata } from 'next'
import type { OptionTable } from '@/lib/validations/options'

export const metadata: Metadata = { title: 'Options' }

const OPTION_TYPES: { type: OptionTable; label: string }[] = [
  { type: 'flavor_options', label: 'Flavors' },
  { type: 'size_options', label: 'Sizes' },
  { type: 'occasion_options', label: 'Occasions' },
  { type: 'theme_options', label: 'Themes' },
  { type: 'decoration_style_options', label: 'Decoration Styles' },
]

export default async function OptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type = 'flavor_options' } = await searchParams
  const activeType = OPTION_TYPES.find((t) => t.type === type)?.type ?? 'flavor_options'

  const result = await getAllOptions(activeType)
  const options = result.data ?? []

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader title="Options Manager" subtitle="Manage dropdown values for the inquiry form" />

      <OptionsManager
        optionTypes={OPTION_TYPES}
        activeType={activeType}
        options={options}
      />
    </div>
  )
}
