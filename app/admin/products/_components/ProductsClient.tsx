'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { FlavorList } from './FlavorList'
import { FlavorDetail } from './FlavorDetail'
import { SizeList } from './SizeList'
import type { FlavorWithPrices, OptionRow } from '@/lib/supabase/types'

interface Props {
  initialFlavors: FlavorWithPrices[]
  sizes: OptionRow[]
}

export function ProductsClient({ initialFlavors, sizes: initialSizes }: Props) {
  const [flavors, setFlavors] = useState<FlavorWithPrices[]>(initialFlavors)
  const [sizes, setSizes] = useState<OptionRow[]>(initialSizes)
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null)
  const [tab, setTab] = useState<'flavors' | 'sizes'>('flavors')

  const selectedFlavor = flavors.find((f) => f.id === selectedFlavorId) ?? null

  const handleFlavorSaved = (updated: FlavorWithPrices) => {
    setFlavors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  const handleFlavorCreated = (created: FlavorWithPrices) => {
    setFlavors((prev) => [...prev, created])
    setSelectedFlavorId(created.id)
  }

  const handleFlavorDeleted = (id: string) => {
    setFlavors((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: false } : f)))
    if (selectedFlavorId === id) setSelectedFlavorId(null)
  }

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <FlavorList
        flavors={flavors}
        sizes={sizes}
        selectedFlavorId={selectedFlavorId}
        tab={tab}
        onSelectFlavor={setSelectedFlavorId}
        onTabChange={setTab}
        onFlavorCreated={handleFlavorCreated}
      />

      <div className="flex-1 overflow-y-auto">
        {tab === 'sizes' ? (
          <SizeList sizes={sizes} onChanged={setSizes} />
        ) : selectedFlavor ? (
          <FlavorDetail
            key={selectedFlavor.id}
            flavor={selectedFlavor}
            sizes={sizes}
            onSaved={handleFlavorSaved}
            onDeleted={handleFlavorDeleted}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 py-24"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <Layers size={40} strokeWidth={1.25} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                Select a flavor to edit
              </p>
              <p className="text-xs mt-1">Or add a new flavor to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
