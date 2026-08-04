'use client'

import { useState, useEffect, useTransition } from 'react'
import { ArrowLeft, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Field, Input, Button, Checkbox } from '@/components/ui'
import { updateOption, deleteOption } from '@/lib/actions/options'
import { upsertFlavorPrices, updateFlavorThemeAvailable } from '@/lib/actions/products'
import { PricingTable } from './PricingTable'
import { FlavorImageUpload } from './FlavorImageUpload'
import type { FlavorWithPrices, OptionRow, FlavorSizePrice } from '@/lib/supabase/types'

interface Props {
  flavor: FlavorWithPrices
  sizes: OptionRow[]
  onSaved: (updated: FlavorWithPrices) => void
  onDeleted: (id: string) => void
  onBack: () => void
  onDirtyChange: (dirty: boolean) => void
}

function buildPriceMap(prices: FlavorSizePrice[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const p of prices) map[p.size_id] = String(p.price)
  return map
}

// Canonical form of the price grid, so dirty-comparison ignores key order,
// blank cells, and 12 vs 12.000 noise.
function canonPrices(map: Record<string, string>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}:${Number(v)}`)
    .filter((s) => !s.endsWith(':NaN'))
    .sort()
    .join('|')
}

export function FlavorDetail({ flavor, sizes, onSaved, onDeleted, onBack, onDirtyChange }: Props) {
  const [name, setName] = useState(flavor.name)
  const [isActive, setIsActive] = useState(flavor.is_active)
  const [themeAvailable, setThemeAvailable] = useState(flavor.theme_available)
  const [imageUrl, setImageUrl] = useState(flavor.image_url)
  const [priceMap, setPriceMap] = useState<Record<string, string>>(() => buildPriceMap(flavor.prices))
  const [nameError, setNameError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  // Baseline for dirty-tracking. Updated on successful save (component is keyed
  // by flavor.id, so a different flavor remounts with a fresh baseline).
  const [snapshot, setSnapshot] = useState({
    name: flavor.name,
    isActive: flavor.is_active,
    themeAvailable: flavor.theme_available,
    prices: canonPrices(buildPriceMap(flavor.prices)),
  })

  const dirty =
    name.trim() !== snapshot.name.trim() ||
    isActive !== snapshot.isActive ||
    themeAvailable !== snapshot.themeAvailable ||
    canonPrices(priceMap) !== snapshot.prices

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  // Releasing the guard on unmount avoids a stale "dirty" flag blocking the
  // next selection after this editor is torn down.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const handlePriceChange = (sizeId: string, value: string) => {
    setPriceMap((prev) => ({ ...prev, [sizeId]: value }))
  }

  // Photo saves immediately (its own resource); mirror the new URL into the
  // parent without disturbing the unsaved form fields.
  const handleImageChanged = (newUrl: string | null) => {
    setImageUrl(newUrl)
    onSaved({ ...flavor, image_url: newUrl })
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Flavor name is required')
      return
    }
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no feedback shown.
      try {
        const nameResult = await updateOption(flavor.id, 'flavor_options', { name: trimmed, is_active: isActive })
        if (nameResult.error) {
          toast.error('Failed to save', { description: nameResult.error })
          return
        }
        if (nameResult.fieldErrors) {
          setNameError(nameResult.fieldErrors.name?.[0] ?? 'Invalid name')
          return
        }

        const themeResult = await updateFlavorThemeAvailable(flavor.id, themeAvailable)
        if (themeResult.error) {
          toast.error('Failed to save', { description: themeResult.error })
          return
        }

        const priceEntries = Object.entries(priceMap)
          .filter(([, v]) => v !== '' && v !== undefined && v !== null)
          .map(([sizeId, v]) => ({ sizeId, price: parseFloat(v) }))
          .filter((e) => !isNaN(e.price))

        const priceResult = await upsertFlavorPrices(flavor.id, priceEntries)
        if (priceResult.error) {
          toast.error('Failed to save prices', { description: priceResult.error })
          return
        }

        const newPrices = priceResult.data ?? flavor.prices
        setLastSaved(new Date())
        setSnapshot({ name: trimmed, isActive, themeAvailable, prices: canonPrices(priceMap) })
        toast.success('Flavor saved', {
          description: `${trimmed} · ${priceEntries.length} price${priceEntries.length !== 1 ? 's' : ''}`,
        })
        onSaved({ ...flavor, name: trimmed, is_active: isActive, theme_available: themeAvailable, image_url: imageUrl, prices: newPrices })
      } catch (err) {
        console.error('[FlavorDetail] save failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startDeleteTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isDeleting`
      // stuck true forever with no feedback shown.
      try {
        const result = await deleteOption(flavor.id, 'flavor_options')
        if (result.error) {
          toast.error('Failed to deactivate', { description: result.error })
          setConfirmDelete(false)
          return
        }
        toast.success('Flavor deactivated')
        onDeleted(flavor.id)
      } catch (err) {
        console.error('[FlavorDetail] delete failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  return (
    <div className="flex flex-col w-full md:h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 md:px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="md:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ color: 'var(--color-ink-secondary)' }}
          aria-label="Back to flavors"
        >
          <ArrowLeft size={18} />
        </button>

        <h2 className="flex-1 min-w-0 text-base font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
          {flavor.name}
        </h2>

        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors shrink-0"
          style={{
            borderColor: isActive ? 'var(--color-success)' : 'var(--color-border)',
            color: isActive ? 'var(--color-success)' : 'var(--color-ink-muted)',
            backgroundColor: isActive ? 'rgba(46,125,82,0.08)' : undefined,
          }}
          aria-pressed={isActive}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete} loading={isDeleting}>
              Deactivate
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors shrink-0 hover:bg-[color:var(--color-surface-raised)]"
            style={{ color: 'var(--color-ink-muted)' }}
            title="Deactivate flavor"
            aria-label="Deactivate flavor"
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* Body — image stacks above the form on mobile, sits beside it on desktop */}
      <div className="flex flex-col md:flex-row flex-1 md:min-h-0 md:overflow-hidden">
        <div
          className="shrink-0 md:w-[280px] md:border-r flex flex-col gap-2 p-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
            Photo
          </span>
          <div className="h-44 md:h-auto md:flex-1 md:min-h-0">
            <FlavorImageUpload flavorId={flavor.id} currentUrl={imageUrl} onChanged={handleImageChanged} />
          </div>
        </div>

        <div className="flex-1 md:overflow-y-auto px-4 md:px-5 py-5 flex flex-col gap-6">
          <Field label="Name" required error={nameError ?? undefined} htmlFor="flavor-name">
            <Input
              id="flavor-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
              aria-invalid={nameError ? true : undefined}
            />
          </Field>

          <Checkbox
            checked={themeAvailable}
            onChange={(e) => setThemeAvailable(e.target.checked)}
            label={
              <span>
                Theme cakes available
                <span className="block text-xs font-normal mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                  When off, customers can&apos;t pick &quot;Theme cake&quot; for this flavor.
                </span>
              </span>
            }
          />

          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-ink-secondary)' }}>
              Pricing
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-muted)' }}>
              Leave a size blank if this flavor doesn&apos;t come in it. Only priced sizes are offered on the order form.
            </p>
            <PricingTable sizes={sizes} priceMap={priceMap} onChange={handlePriceChange} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-3 px-4 md:px-5 py-3 border-t shrink-0 sticky bottom-0 md:static"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
      >
        {dirty ? (
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-warning)' }}>
            Unsaved changes
          </span>
        ) : lastSaved ? (
          <span className="text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <Button className="ml-auto" onClick={handleSave} loading={isPending} disabled={!dirty}>
          Save
        </Button>
      </div>
    </div>
  )
}
