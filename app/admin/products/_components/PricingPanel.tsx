'use client'

import { useState } from 'react'
import { Field, Input, Button } from '@/components/ui'
import { updateSetting } from '@/lib/actions/settings'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  /** Active sizes — base prices are keyed by size id, so a rename keeps them. */
  sizes: OptionRow[]
  initialMatrix: Record<string, number>
  initialMinGuard: number
  initialRushMultiplier: number
}

const toStr = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? '' : String(n))

/** Base price per size + the global pricing rules. These feed the "suggested
 *  price" and rush rate when Zainab creates an inquiry; they don't set the
 *  customer-facing per-flavor prices (those live on each flavor). Keyed by
 *  size id so renaming a size never orphans its price. */
export function PricingPanel({ sizes, initialMatrix, initialMinGuard, initialRushMultiplier }: Props) {
  const [matrix, setMatrix] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const s of sizes) m[s.id] = toStr(initialMatrix[s.id])
    return m
  })
  const [minGuard, setMinGuard] = useState(toStr(initialMinGuard))
  const [rush, setRush] = useState(toStr(initialRushMultiplier))
  const [saved, setSaved] = useState({
    matrix: JSON.stringify(sizes.map((s) => toStr(initialMatrix[s.id]))),
    minGuard: toStr(initialMinGuard),
    rush: toStr(initialRushMultiplier),
  })
  const currentMatrixKey = JSON.stringify(sizes.map((s) => matrix[s.id] ?? ''))
  const dirty = currentMatrixKey !== saved.matrix || minGuard !== saved.minGuard || rush !== saved.rush

  const { run: handleSave, pending: isPending } = useAsyncAction(
    async () => {
      const nextMatrix: Record<string, number> = {}
      for (const s of sizes) {
        const v = parseFloat(matrix[s.id] ?? '')
        if (!Number.isNaN(v)) nextMatrix[s.id] = v
      }
      const [r1, r2, r3] = await Promise.all([
        updateSetting('pricing_matrix', nextMatrix),
        updateSetting('min_price_guard', String(parseFloat(minGuard) || 0)),
        updateSetting('rush_multiplier', String(parseFloat(rush) || 1)),
      ])
      const err = r1.error ?? r2.error ?? r3.error
      if (err) return { error: err }
      setSaved({ matrix: currentMatrixKey, minGuard, rush })
    },
    { successToast: 'Base prices saved', errorToast: 'Failed to save base prices' }
  )

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          Base prices
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          Suggested starting price per size when you create an inquiry.
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {sizes.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Add a size above to set its base price.
          </p>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {sizes.map((size) => {
              const raw = matrix[size.id] ?? ''
              const invalid = raw !== '' && (isNaN(Number(raw)) || Number(raw) < 0)
              return (
                <div key={size.id} className="flex items-center gap-4" style={{ minHeight: 48 }}>
                  <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--color-ink)' }}>
                    {size.name}
                  </span>
                  <div
                    className="flex items-center gap-1 rounded-lg border px-3 py-2 focus-within:shadow-[0_0_0_3px_var(--color-teal-light)] transition-shadow"
                    style={{ borderColor: invalid ? 'var(--color-danger)' : 'var(--color-border)' }}
                  >
                    <span className="text-xs font-medium select-none" style={{ color: 'var(--color-ink-muted)' }}>KD</span>
                    <input
                      type="number"
                      min="0"
                      max="9999.999"
                      step="0.05"
                      inputMode="decimal"
                      value={raw}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setMatrix((prev) => ({ ...prev, [size.id]: e.target.value }))}
                      placeholder="0.000"
                      aria-label={`Base price for ${size.name}`}
                      aria-invalid={invalid || undefined}
                      className="w-24 bg-transparent text-sm text-right outline-none"
                      style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Field label="Minimum price (KD)" hint="Warns you below this on an inquiry" htmlFor="min-price">
            <Input
              id="min-price"
              type="number"
              min="0"
              step="0.05"
              inputMode="decimal"
              value={minGuard}
              onChange={(e) => setMinGuard(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </Field>
          <Field label="Rush multiplier" hint="Applied within lead time + 2 days" htmlFor="rush-mult">
            <Input
              id="rush-mult"
              type="number"
              min="1"
              max="5"
              step="0.01"
              inputMode="decimal"
              value={rush}
              onChange={(e) => setRush(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </Field>
        </div>
      </div>

      <div
        className="flex items-center gap-3 px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {dirty && (
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-warning)' }}>
            Unsaved changes
          </span>
        )}
        <Button className="ml-auto" onClick={handleSave} loading={isPending} disabled={!dirty}>
          Save prices
        </Button>
      </div>
    </div>
  )
}
