'use client'

import type { OptionRow, FlavorSizePrice } from '@/lib/supabase/types'

interface Props {
  sizes: OptionRow[]
  prices: FlavorSizePrice[]
  priceMap: Record<string, string>
  onChange: (sizeId: string, value: string) => void
}

export function PricingTable({ sizes, priceMap, onChange }: Props) {
  if (sizes.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
        No sizes configured. Add sizes first in the Sizes tab.
      </p>
    )
  }

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {sizes.map((size) => (
        <div
          key={size.id}
          className="flex items-center gap-4"
          style={{ minHeight: 54 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              {size.name}
            </p>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border px-3 py-2 focus-within:ring-2 transition-shadow"
            style={{
              borderColor: 'var(--color-border)',
              // @ts-expect-error CSS variable
              '--tw-ring-color': 'var(--color-teal)',
            }}
          >
            <span className="text-xs font-medium select-none" style={{ color: 'var(--color-ink-muted)' }}>
              KD
            </span>
            <input
              type="number"
              min="0"
              max="9999.999"
              step="0.001"
              value={priceMap[size.id] ?? ''}
              onChange={(e) => onChange(size.id, e.target.value)}
              placeholder="0.000"
              className="w-24 bg-transparent text-sm font-mono text-right outline-none"
              style={{ color: 'var(--color-ink)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
