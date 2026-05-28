'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateSetting } from '@/lib/actions/settings'

interface Props {
  sizes: { id: string; name: string }[]
  initialMatrix: Record<string, number>
  initialMinGuard: number
  initialRushMultiplier: number
}

export default function PricingForm({
  sizes,
  initialMatrix,
  initialMinGuard,
  initialRushMultiplier,
}: Props) {
  const [matrix, setMatrix] = useState<Record<string, number>>(initialMatrix)
  const [minGuard, setMinGuard] = useState(initialMinGuard)
  const [rushMultiplier, setRushMultiplier] = useState(initialRushMultiplier)

  const [isPending, startTransition] = useTransition()

  function handleMatrixChange(sizeName: string, rawValue: string) {
    const num = parseFloat(rawValue)
    setMatrix((prev) => ({ ...prev, [sizeName]: isNaN(num) ? 0 : num }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const [r1, r2, r3] = await Promise.all([
        updateSetting('pricing_matrix', matrix),
        updateSetting('min_price_guard', String(minGuard)),
        updateSetting('rush_multiplier', String(rushMultiplier)),
      ])
      const err = r1.error ?? r2.error ?? r3.error
      if (err) {
        toast.error('Failed to save', { description: err })
        return
      }
      toast.success('Pricing saved')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Price Matrix card */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
          Base Prices by Size
        </p>

        {sizes.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--color-ink-muted)' }}>
            No active sizes found.
          </p>
        ) : (
          <div className="space-y-3">
            {sizes.map((size) => (
              <div key={size.id} className="flex items-center justify-between gap-4">
                <span className="text-sm shrink-0" style={{ color: 'var(--color-ink-secondary)' }}>
                  {size.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>KWD</span>
                  <input
                    type="number"
                    step="0.001"
                    min={0}
                    max={9999}
                    value={matrix[size.name] ?? 0}
                    onChange={(e) => handleMatrixChange(size.name, e.target.value)}
                    className="w-28 rounded-lg border px-3 py-2 text-sm outline-none transition-all text-right"
                    style={{
                      backgroundColor: 'var(--color-cream)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guards card */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
          Pricing Rules
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="min_price_guard"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Minimum Price (KWD)
            </label>
            <input
              id="min_price_guard"
              type="number"
              step="0.001"
              min={0}
              value={minGuard}
              onChange={(e) => setMinGuard(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-cream)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="rush_multiplier"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Rush Multiplier
            </label>
            <input
              id="rush_multiplier"
              type="number"
              step="0.01"
              min={1}
              max={5}
              value={rushMultiplier}
              onChange={(e) => setRushMultiplier(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-cream)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
              Applied when event date is within lead time + 2 days
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
      >
        {isPending ? 'Saving…' : 'Save Pricing'}
      </button>
    </form>
  )
}
