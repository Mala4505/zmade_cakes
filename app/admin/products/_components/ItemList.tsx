'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Input, Button, Spinner } from '@/components/ui'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  items: OptionRow[]
  onChanged: (items: OptionRow[]) => void
}

/**
 * Local stand-in for `components/ui/IconButton` (not present in this worktree
 * yet — a sibling agent owns that file). Same contract: 44x44 hit area via
 * `min-h-11 min-w-11 -m-2`, required aria-label, neutral/danger tone. Replace
 * with the shared import once it lands.
 */
function IconButton({
  icon,
  label,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex items-center justify-center min-h-11 min-w-11 -m-2 rounded-lg transition-colors hover:bg-[color:var(--color-surface-raised)] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: tone === 'danger' ? 'var(--color-danger)' : 'var(--color-ink-muted)' }}
    >
      {icon}
    </button>
  )
}

/** Catalog of non-cake "other items" (jars, brownies…). Name + active only;
 *  each item's price is set per order on the inquiry, not here. */
export function ItemList({ items, onChanged }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAddPending, startAddTransition] = useTransition()

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setError(null)
  }

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Enter an item name')
      return
    }
    startAddTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isAddPending`
      // stuck true forever with no error ever shown.
      try {
        const result = await createOption('item_options', { name: trimmed, sort_order: items.length, is_active: true })
        if (result.error !== null) {
          setError(result.error)
          return
        }
        if (result.fieldErrors !== null) {
          setError(result.fieldErrors.name?.[0] ?? 'Could not add item')
          return
        }
        onChanged([...items, result.data])
        toast.success('Item added')
        setNewName('')
        setError(null)
        setAdding(false)
      } catch (err) {
        console.error('[ItemList] add failed:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8" style={{ maxWidth: 560 }}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
        Items
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
        Non-cake items customers can request (jars, brownie boxes…). Price is set per order.
      </p>

      <div className="flex flex-col gap-1 mb-3">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onChanged={(updated) =>
              updated
                ? onChanged(items.map((it) => (it.id === item.id ? updated : it)))
                : onChanged(items.filter((it) => it.id !== item.id))
            }
          />
        ))}

        {items.length === 0 && !adding && (
          <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
            No items yet. Add one below.
          </p>
        )}
      </div>

      {adding ? (
        <div>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                if (e.key === 'Escape') { e.preventDefault(); cancelAdd() }
              }}
              placeholder="Item name…"
              disabled={isAddPending}
              aria-invalid={error ? true : undefined}
              aria-label="New item name"
            />
            <Button size="sm" onClick={handleAdd} loading={isAddPending} disabled={!newName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelAdd} disabled={isAddPending}>
              Cancel
            </Button>
          </div>
          {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 text-sm rounded-lg border-2 border-dashed px-3 w-full transition-colors hover:border-[color:var(--color-border-strong)]"
          style={{ minHeight: 48, borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
        >
          <Plus size={16} weight="bold" />
          <span>Add item</span>
        </button>
      )}
    </div>
  )
}

function ItemRow({ item, onChanged }: { item: OptionRow; onChanged: (updated: OptionRow | null) => void }) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleToggle = () => {
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no feedback shown.
      try {
        const result = await updateOption(item.id, 'item_options', { is_active: !item.is_active })
        if (result.error) toast.error('Failed to update', { description: result.error })
        else if (result.data) onChanged(result.data)
      } catch (err) {
        console.error('[ItemList] toggle failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no feedback shown.
      try {
        const result = await deleteOption(item.id, 'item_options')
        if (result.error) {
          toast.error('Failed to deactivate', { description: result.error })
          setConfirmDelete(false)
        } else {
          onChanged(null)
          toast.success('Item deactivated')
        }
      } catch (err) {
        console.error('[ItemList] deactivate failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3"
      style={{ minHeight: 48, opacity: item.is_active ? 1 : 0.55 }}
    >
      <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--color-ink)' }}>
        {item.name}
      </span>

      {isPending ? (
        <Spinner size={14} className="text-[color:var(--color-ink-muted)]" />
      ) : confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Cancel
          </button>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            Deactivate
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggle}
            className="text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors"
            style={{
              borderColor: item.is_active ? 'var(--color-success)' : 'var(--color-border)',
              color: item.is_active ? 'var(--color-success)' : 'var(--color-ink-muted)',
            }}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </button>
          {item.is_active && (
            <IconButton
              icon={<Trash size={14} />}
              label={`Deactivate ${item.name}`}
              onClick={() => setConfirmDelete(true)}
              tone="danger"
            />
          )}
        </div>
      )}
    </div>
  )
}
