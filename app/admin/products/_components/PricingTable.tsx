'use client'

import { Input } from '@/components/ui'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  sizes: OptionRow[]
  priceMap: Record<string, string>
  onChange: (sizeId: string, value: string) => void
}

export function PricingTable({ sizes, priceMap, onChange }: Props) {
  if (sizes.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
        No sizes configured yet. Add sizes in the Sizes tab first.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {sizes.map((size) => {
        const raw = priceMap[size.id] ?? ''
        const invalid = raw !== '' && (isNaN(Number(raw)) || Number(raw) < 0)
        return (
          <div key={size.id} className="flex items-center gap-4" style={{ minHeight: 52 }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                {size.name}
              </p>
            </div>

            <Input
              type="number"
              min="0"
              max="9999.999"
              step="0.05"
              inputMode="decimal"
              value={raw}
              onChange={(e) => onChange(size.id, e.target.value)}
              placeholder="0.000"
              aria-label={`Price for ${size.name}`}
              aria-invalid={invalid || undefined}
              prefix="KD"
              size="base"
              className="w-24 text-right"
            />
          </div>
        )
      })}
    </div>
  )
}
