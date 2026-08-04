'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input, Button } from '@/components/ui'
import { createOption } from '@/lib/actions/options'
import type { FlavorWithPrices } from '@/lib/supabase/types'

interface Props {
  flavors: FlavorWithPrices[]
  selectedFlavorId: string | null
  onSelectFlavor: (id: string) => void
  onFlavorCreated: (flavor: FlavorWithPrices) => void
  className?: string
}

function priceRange(flavor: FlavorWithPrices): string {
  if (!flavor.prices || flavor.prices.length === 0) return ''
  const nums = flavor.prices.map((p) => p.price).filter((n) => !isNaN(n))
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
        className="rounded-lg object-cover shrink-0"
        style={{ width: 40, height: 40 }}
      />
    )
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
      style={{ width: 40, height: 40, backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal)' }}
    >
      {initial}
    </div>
  )
}

export function FlavorList({ flavors, selectedFlavorId, onSelectFlavor, onFlavorCreated, className }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setError(null)
  }

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Enter a flavor name')
      return
    }
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no error ever shown.
      try {
        const result = await createOption('flavor_options', { name: trimmed, sort_order: 0, is_active: true })
        if (result.error !== null) {
          setError(result.error)
          return
        }
        if (result.fieldErrors !== null) {
          setError(result.fieldErrors.name?.[0] ?? 'Could not add flavor')
          return
        }
        onFlavorCreated({ ...result.data, theme_available: true, prices: [] })
        toast.success('Flavor added')
        setNewName('')
        setError(null)
        setAdding(false)
      } catch (err) {
        console.error('[FlavorList] add failed:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <aside
      className={cn('flex-col shrink-0 w-full md:w-64 md:border-r', className)}
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
    >
      <div className="flex-1 md:min-h-0 md:overflow-y-auto p-2 flex flex-col gap-1">
        {flavors.length === 0 && !adding && (
          <p className="px-2 py-6 text-center text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            No flavors yet. Add your first below.
          </p>
        )}

        {flavors.map((flavor) => {
          const active = selectedFlavorId === flavor.id
          const range = priceRange(flavor)
          return (
            <button
              key={flavor.id}
              type="button"
              onClick={() => onSelectFlavor(flavor.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 w-full text-left transition-colors',
                active ? 'bg-[color:var(--color-teal-light)]' : 'hover:bg-[color:var(--color-surface-raised)]'
              )}
              style={{ minHeight: 56 }}
              aria-current={active ? 'true' : undefined}
            >
              <FlavorThumb flavor={flavor} />
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: active ? 'var(--color-teal)' : 'var(--color-ink)' }}
                >
                  {flavor.name}
                </div>
                <div
                  className="text-[11px] truncate"
                  style={{ color: 'var(--color-ink-muted)', fontFamily: range ? 'var(--font-mono)' : undefined }}
                >
                  {range || 'No prices set'}
                </div>
              </div>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: flavor.is_active ? 'var(--color-success)' : 'var(--color-border-strong)' }}
                title={flavor.is_active ? 'Active' : 'Inactive'}
              />
            </button>
          )
        })}

        {adding ? (
          <div className="px-1 py-1">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                  if (e.key === 'Escape') { e.preventDefault(); cancelAdd() }
                }}
                placeholder="Flavor name…"
                disabled={isPending}
                aria-invalid={error ? true : undefined}
                aria-label="New flavor name"
              />
              <Button size="sm" onClick={handleAdd} loading={isPending} disabled={!newName.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelAdd} disabled={isPending}>
                Cancel
              </Button>
            </div>
            {error && (
              <p className="mt-1 px-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors w-full hover:border-[color:var(--color-border-strong)]"
            style={{ minHeight: 48, borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
          >
            <Plus size={16} weight="bold" />
            <span>Add flavor</span>
          </button>
        )}
      </div>
    </aside>
  )
}
