'use client'

import { useState } from 'react'
import { Stack } from '@phosphor-icons/react'
import { Modal, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { FlavorList } from './FlavorList'
import { FlavorDetail } from './FlavorDetail'
import { SizeList } from './SizeList'
import { ItemList } from './ItemList'
import { PricingPanel } from './PricingPanel'
import type { FlavorWithPrices, OptionRow } from '@/lib/supabase/types'

interface Props {
  initialFlavors: FlavorWithPrices[]
  sizes: OptionRow[]
  items: OptionRow[]
  pricingMatrix: Record<string, number>
  minPriceGuard: number
  rushMultiplier: number
}

type Tab = 'flavors' | 'items' | 'sizes'

export function ProductsClient({
  initialFlavors,
  sizes: initialSizes,
  items: initialItems,
  pricingMatrix,
  minPriceGuard,
  rushMultiplier,
}: Props) {
  const [flavors, setFlavors] = useState<FlavorWithPrices[]>(initialFlavors)
  const [sizes, setSizes] = useState<OptionRow[]>(initialSizes)
  const [items, setItems] = useState<OptionRow[]>(initialItems)
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('flavors')

  // Dirty-state guard: FlavorDetail reports unsaved edits; a pending navigation
  // is parked until the user confirms discarding them.
  const [detailDirty, setDetailDirty] = useState(false)
  const [pending, setPending] = useState<{ type: 'flavor'; id: string | null } | { type: 'tab'; tab: Tab } | null>(null)

  const selectedFlavor = flavors.find((f) => f.id === selectedFlavorId) ?? null

  const handleFlavorSaved = (updated: FlavorWithPrices) => {
    setFlavors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  const handleFlavorCreated = (created: FlavorWithPrices) => {
    setFlavors((prev) => [...prev, created])
    setSelectedFlavorId(created.id)
  }

  const handleFlavorDeleted = (id: string) => {
    setFlavors((prev) => prev.filter((f) => f.id !== id))
    if (selectedFlavorId === id) setSelectedFlavorId(null)
    setDetailDirty(false)
  }

  // Guarded navigation — any move away from a dirty editor routes through a confirm.
  const selectFlavor = (id: string | null) => {
    if (detailDirty && id !== selectedFlavorId) {
      setPending({ type: 'flavor', id })
      return
    }
    setSelectedFlavorId(id)
  }

  const changeTab = (next: Tab) => {
    if (next === tab) return
    if (detailDirty && tab === 'flavors' && selectedFlavorId) {
      setPending({ type: 'tab', tab: next })
      return
    }
    setTab(next)
  }

  const confirmDiscard = () => {
    if (!pending) return
    setDetailDirty(false)
    if (pending.type === 'flavor') setSelectedFlavorId(pending.id)
    else setTab(pending.tab)
    setPending(null)
  }

  const detailOpenOnMobile = tab === 'flavors' && !!selectedFlavorId

  return (
    <div className="flex flex-col md:h-svh md:overflow-hidden">
      {/* Top segmented tabs — identical on mobile and desktop */}
      <div
        className="sticky top-14 z-10 md:static flex items-center gap-1 border-b px-3 py-2 shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
      >
        {([
          ['flavors', 'Flavors', flavors.length],
          ['items', 'Items', items.length],
          ['sizes', 'Sizes', sizes.length],
        ] as const).map(([t, label, count]) => {
          const active = tab === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => changeTab(t)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                active ? 'text-[color:var(--color-teal)]' : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink-secondary)]'
              )}
              style={active ? { backgroundColor: 'var(--color-teal-light)' } : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {count ? `${label} · ${count}` : label}
            </button>
          )
        })}
      </div>

      {tab === 'items' ? (
        <div className="flex-1 md:min-h-0 md:overflow-y-auto">
          <ItemList items={items} onChanged={setItems} />
        </div>
      ) : tab === 'sizes' ? (
        <div className="flex-1 md:min-h-0 md:overflow-y-auto">
          <div className="px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6" style={{ maxWidth: 640 }}>
            <SizeList sizes={sizes} onChanged={setSizes} embedded />
            <PricingPanel
              sizes={sizes.filter((s) => s.is_active)}
              initialMatrix={pricingMatrix}
              initialMinGuard={minPriceGuard}
              initialRushMultiplier={rushMultiplier}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 md:min-h-0">
          {/* Master — flavor list. Hidden on mobile once an editor is open. */}
          <FlavorList
            flavors={flavors}
            selectedFlavorId={selectedFlavorId}
            onSelectFlavor={selectFlavor}
            onFlavorCreated={handleFlavorCreated}
            className={detailOpenOnMobile ? 'hidden md:flex' : 'flex'}
          />

          {/* Detail — editor / empty. On mobile only visible when a flavor is picked. */}
          <div className={cn('flex-1 min-w-0', detailOpenOnMobile ? 'flex' : 'hidden md:flex')}>
            {selectedFlavor ? (
              <FlavorDetail
                key={selectedFlavor.id}
                flavor={selectedFlavor}
                sizes={sizes}
                onSaved={handleFlavorSaved}
                onDeleted={handleFlavorDeleted}
                onBack={() => selectFlavor(null)}
                onDirtyChange={setDetailDirty}
              />
            ) : (
              <div
                className="hidden md:flex flex-col items-center justify-center w-full gap-3 py-24"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                <Stack size={40} weight="thin" />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                    Select a flavor to edit
                  </p>
                  <p className="text-xs mt-1">Or add a new flavor from the list</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Discard unsaved changes?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={confirmDiscard}>
              Discard
            </Button>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          This flavor has edits that haven&apos;t been saved. Leaving now will lose them.
        </p>
      </Modal>
    </div>
  )
}
