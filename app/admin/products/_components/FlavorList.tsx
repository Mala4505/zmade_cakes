'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createOption } from '@/lib/actions/options'
import type { FlavorWithPrices, OptionRow } from '@/lib/supabase/types'

interface Props {
  flavors: FlavorWithPrices[]
  sizes: OptionRow[]
  selectedFlavorId: string | null
  tab: 'flavors' | 'sizes'
  onSelectFlavor: (id: string) => void
  onTabChange: (tab: 'flavors' | 'sizes') => void
  onFlavorCreated: (flavor: FlavorWithPrices) => void
}

function priceRange(flavor: FlavorWithPrices): string {
  if (!flavor.prices || flavor.prices.length === 0) return ''
  const nums = flavor.prices.map((p) => parseFloat(p.price)).filter((n) => !isNaN(n))
  if (nums.length === 0) return ''
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return min === max ? `KD ${min.toFixed(3)}` : `KD ${min.toFixed(3)} – ${max.toFixed(3)}`
}

function FlavorThumb({ flavor }: { flavor: FlavorWithPrices }) {
  const initial = flavor.name?.[0]?.toUpperCase() ?? '?'
  if (flavor.image_url) {
    return (
      <img
        src={flavor.image_url}
        alt=""
        className="rounded-lg object-cover flex-shrink-0"
        style={{ width: 36, height: 36 }}
      />
    )
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
      style={{
        width: 36,
        height: 36,
        backgroundColor: 'var(--color-teal-light)',
        color: 'var(--color-teal)',
      }}
    >
      {initial}
    </div>
  )
}

export function FlavorList({
  flavors,
  selectedFlavorId,
  tab,
  onSelectFlavor,
  onTabChange,
  onFlavorCreated,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const handleAdd = () => {
    if (!newName.trim()) {
      setAdding(false)
      return
    }
    startTransition(async () => {
      const result = await createOption('flavor_options', {
        name: newName.trim(),
        sort_order: 0,
        is_active: true,
      })
      if (result.data) {
        onFlavorCreated({ ...result.data, prices: [] })
      }
      setNewName('')
      setAdding(false)
    })
  }

  const tabs = ['flavors', 'sizes'] as const

  return (
    <aside
      className="flex flex-col shrink-0 border-r"
      style={{
        width: 240,
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-cream)',
      }}
    >
      {/* Tab header */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className="flex-1 py-3 text-xs font-semibold capitalize transition-colors relative"
            style={{
              color: tab === t ? 'var(--color-teal)' : 'var(--color-ink-muted)',
            }}
          >
            {t}
            {tab === t && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: 'var(--color-teal)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Flavor list */}
      {tab === 'flavors' && (
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
          {flavors.map((flavor) => {
            const active = selectedFlavorId === flavor.id
            const range = priceRange(flavor)
            return (
              <button
                key={flavor.id}
                type="button"
                onClick={() => onSelectFlavor(flavor.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 w-full text-left transition-colors',
                  active ? 'bg-[color:var(--color-teal-light)]' : 'hover:bg-[color:var(--color-surface-raised)]'
                )}
                style={{ minHeight: 52 }}
              >
                <FlavorThumb flavor={flavor} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: active ? 'var(--color-teal)' : 'var(--color-ink)' }}
                  >
                    {flavor.name}
                  </div>
                  {range ? (
                    <div className="text-[11px] truncate" style={{ color: 'var(--color-ink-muted)' }}>
                      {range}
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
                      No prices set
                    </div>
                  )}
                </div>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: flavor.is_active ? 'var(--color-success)' : 'var(--color-border)' }}
                />
              </button>
            )
          })}

          {/* Add flavor inline input */}
          {adding ? (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg border" style={{ borderColor: 'var(--color-teal)' }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setAdding(false); setNewName('') }
                }}
                placeholder="Flavor name…"
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: 'var(--color-ink)' }}
                disabled={isPending}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !newName.trim()}
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--color-teal)', color: '#fff' }}
              >
                {isPending ? '…' : 'Add'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-2 py-2.5 rounded-lg border-2 border-dashed text-sm transition-colors w-full"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
            >
              <Plus size={14} />
              <span>Add flavor</span>
            </button>
          )}
        </div>
      )}

      {tab === 'sizes' && (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <p className="text-xs">Manage sizes →</p>
        </div>
      )}
    </aside>
  )
}
