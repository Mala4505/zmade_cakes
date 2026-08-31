'use client'

import { OptionRowList } from './OptionRowList'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  items: OptionRow[]
  onChanged: (items: OptionRow[]) => void
}

/** Catalog of non-cake "other items" (jars, brownies…). Name + active only;
 *  each item's price is set per order on the inquiry, not here. */
export function ItemList({ items, onChanged }: Props) {
  return (
    <OptionRowList
      table="item_options"
      noun="item"
      rows={items}
      onChanged={onChanged}
      heading="Items"
      description="Non-cake items customers can request (jars, brownie boxes…). Price is set per order."
      className="px-4 md:px-8 py-6 md:py-8"
    />
  )
}
