'use client'

import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { Input, Button, Spinner, IconButton } from '@/components/ui'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  items: OptionRow[]
  onChanged: (items: OptionRow[]) => void
}

/** Catalog of non-cake "other items" (jars, brownies…). Name + active only;
 *  each item's price is set per order on the inquiry, not here. */
export function ItemList({ items, onChanged }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setError(null)
  }

  const { run: runAdd, pending: isAddPending } = useAsyncAction(
    async (trimmed: string) => {
      const result = await createOption('item_options', { name: trimmed, sort_order: items.length, is_active: true })
      if (result.error !== null) return { error: result.error }
      if (result.fieldErrors !== null) {
        setError(result.fieldErrors.name?.[0] ?? 'Could not add item')
        return false
      }
      onChanged([...items, result.data])
      setNewName('')
      setError(null)
      setAdding(false)
    },
    { successToast: 'Item added' }
  )

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Enter an item name')
      return
    }
    runAdd(trimmed)
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
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { run: handleToggle, pending: togglePending } = useAsyncAction(
    async () => {
      const result = await updateOption(item.id, 'item_options', { is_active: !item.is_active })
      if (result.error) return { error: result.error }
      if (result.data) onChanged(result.data)
    },
    { successToast: 'Item updated' }
  )

  const { run: handleDelete, pending: deletePending } = useAsyncAction(
    async () => {
      const result = await deleteOption(item.id, 'item_options')
      if (result.error) {
        setConfirmDelete(false)
        return { error: result.error }
      }
      onChanged(null)
    },
    { successToast: 'Item deactivated' }
  )

  const isPending = togglePending || deletePending

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
              onClick={() => setConfirmDelete(true)}
              tone="danger"
              aria-label={`Deactivate ${item.name}`}
            >
              <Trash size={14} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  )
}
