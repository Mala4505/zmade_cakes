'use client'

import { OptionRowList } from './OptionRowList'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  sizes: OptionRow[]
  onChanged: (sizes: OptionRow[]) => void
  /** When rendered inside the Sizes tab (beside the base-price panel), the
   *  parent owns the page padding and width, so drop the outer wrapper. */
  embedded?: boolean
}

export function SizeList({ sizes, onChanged, embedded = false }: Props) {
  return (
    <OptionRowList
      table="size_options"
      noun="size"
      rows={sizes}
      onChanged={onChanged}
      heading="Sizes"
      description="Sizes are shared across every flavor. Each flavor sets its own price per size."
      className={embedded ? undefined : 'px-4 md:px-8 py-6 md:py-8'}
      constrainWidth={!embedded}
    />
  )
}
