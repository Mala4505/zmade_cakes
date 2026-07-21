'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
}

function buildPriceMap(prices: FlavorSizePrice[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const p of prices) map[p.size_id] = String(p.price)
  return map
}

export function FlavorDetail({ flavor, sizes, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(flavor.name)
  const [isActive, setIsActive] = useState(flavor.is_active)
  const [themeAvailable, setThemeAvailable] = useState(flavor.theme_available)
  const [imageUrl, setImageUrl] = useState(flavor.image_url)
  const [priceMap, setPriceMap] = useState<Record<string, string>>(() => buildPriceMap(flavor.prices))
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const handlePriceChange = (sizeId: string, value: string) => {
    setPriceMap((prev) => ({ ...prev, [sizeId]: value }))
  }

  const handleImageChanged = (newUrl: string | null) => {
    setImageUrl(newUrl)
    onSaved({ ...flavor, name, is_active: isActive, theme_available: themeAvailable, image_url: newUrl, prices: flavor.prices })
  }

  const handleSave = () => {
    startTransition(async () => {
      const nameResult = await updateOption(flavor.id, 'flavor_options', {
        name: name.trim(),
        is_active: isActive,
      })
      if (nameResult.error) {
        toast.error('Failed to save', { description: nameResult.error })
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
      toast.success('Flavor saved', {
        description: `${name.trim()} · ${priceEntries.length} price${priceEntries.length !== 1 ? 's' : ''} saved`,
      })
      onSaved({
        ...flavor,
        name: name.trim(),
        is_active: isActive,
        theme_available: themeAvailable,
        image_url: imageUrl,
        prices: newPrices,
      })
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startDeleteTransition(async () => {
      const result = await deleteOption(flavor.id, 'flavor_options')
      if (result.error) {
        toast.error('Failed to delete', { description: result.error })
        setConfirmDelete(false)
        return
      }
      toast.success('Flavor deactivated')
      onDeleted(flavor.id)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — full width, no thumbnail (image lives in left panel) */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
      >
        <h2 className="flex-1 text-base font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
          {flavor.name}
        </h2>

        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="text-xs font-semibold rounded-full px-3 py-1 border transition-colors"
          style={{
            borderColor: isActive ? 'var(--color-success)' : 'var(--color-border)',
            color: isActive ? 'var(--color-success)' : 'var(--color-ink-muted)',
            backgroundColor: isActive ? 'rgba(0,160,80,0.08)' : undefined,
          }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
            >
              {isDeleting ? '…' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-ink-muted)' }}
            title="Deactivate flavor"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Body: image left | form right — each column scrolls independently */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — image fills column height */}
        <div
          className="w-[280px] shrink-0 border-r flex flex-col p-4 gap-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--color-ink-secondary)' }}>
            Photo
          </span>
          <div className="flex-1 min-h-0">
            <FlavorImageUpload
              flavorId={flavor.id}
              currentUrl={imageUrl}
              onChanged={handleImageChanged}
            />
          </div>
        </div>

        {/* Right — name + pricing */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          <section>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-cream)',
                color: 'var(--color-ink)',
                // @ts-expect-error CSS variable
                '--tw-ring-color': 'var(--color-teal)',
              }}
            />
          </section>

          <section>
            <label
              className="flex items-center gap-2.5 text-sm cursor-pointer select-none w-fit"
              style={{ color: 'var(--color-ink)' }}
            >
              <input
                type="checkbox"
                checked={themeAvailable}
                onChange={(e) => setThemeAvailable(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <span>
                <span className="font-medium">Theme cakes available</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                  When off, customers can&apos;t select &quot;Theme cake&quot; for this flavor on the order form.
                </span>
              </span>
            </label>
          </section>

          <section>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              Pricing
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-muted)' }}>
              Leave a size blank if this flavor doesn&apos;t come in it — only priced sizes are offered on the order form.
            </p>
            <PricingTable
              sizes={sizes}
              prices={flavor.prices}
              priceMap={priceMap}
              onChange={handlePriceChange}
            />
          </section>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-t shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
      >
        {lastSaved && (
          <span className="text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: '#fff' }}
        >
          {isPending && <Loader2 size={13} className="animate-spin" />}
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
