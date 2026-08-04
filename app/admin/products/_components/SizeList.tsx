'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Input, Button, Spinner } from '@/components/ui'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  sizes: OptionRow[]
  onChanged: (sizes: OptionRow[]) => void
  /** When rendered inside the Sizes tab (beside the base-price panel), the
   *  parent owns the page padding and width, so drop the outer wrapper. */
  embedded?: boolean
}

export function SizeList({ sizes, onChanged, embedded = false }: Props) {
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
      setError('Enter a size name')
      return
    }
    startAddTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isAddPending`
      // stuck true forever with no error ever shown.
      try {
        const result = await createOption('size_options', { name: trimmed, sort_order: sizes.length, is_active: true })
        if (result.error !== null) {
          setError(result.error)
          return
        }
        if (result.fieldErrors !== null) {
          setError(result.fieldErrors.name?.[0] ?? 'Could not add size')
          return
        }
        onChanged([...sizes, result.data])
        toast.success('Size added')
        setNewName('')
        setError(null)
        setAdding(false)
      } catch (err) {
        console.error('[SizeList] add failed:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className={embedded ? undefined : 'px-4 md:px-8 py-6 md:py-8'} style={embedded ? undefined : { maxWidth: 560 }}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
        Sizes
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
        Sizes are shared across every flavor. Each flavor sets its own price per size.
      </p>

      <div className="flex flex-col gap-1 mb-3">
        {sizes.map((size) => (
          <SizeRow
            key={size.id}
            size={size}
            onChanged={(updated) =>
              updated
                ? onChanged(sizes.map((s) => (s.id === size.id ? updated : s)))
                : onChanged(sizes.filter((s) => s.id !== size.id))
            }
          />
        ))}

        {sizes.length === 0 && !adding && (
          <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
            No sizes yet. Add one below.
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
              placeholder="Size name…"
              disabled={isAddPending}
              aria-invalid={error ? true : undefined}
              aria-label="New size name"
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
          <span>Add size</span>
        </button>
      )}
    </div>
  )
}

function SizeRow({ size, onChanged }: { size: OptionRow; onChanged: (updated: OptionRow | null) => void }) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleToggle = () => {
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no feedback shown.
      try {
        const result = await updateOption(size.id, 'size_options', { is_active: !size.is_active })
        if (result.error) toast.error('Failed to update', { description: result.error })
        else if (result.data) onChanged(result.data)
      } catch (err) {
        console.error('[SizeList] toggle failed:', err)
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
        const result = await deleteOption(size.id, 'size_options')
        if (result.error) {
          toast.error('Failed to deactivate', { description: result.error })
          setConfirmDelete(false)
        } else {
          onChanged(null)
          toast.success('Size deactivated')
        }
      } catch (err) {
        console.error('[SizeList] deactivate failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3"
      style={{ minHeight: 48, opacity: size.is_active ? 1 : 0.55 }}
    >
      <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--color-ink)' }}>
        {size.name}
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
              borderColor: size.is_active ? 'var(--color-success)' : 'var(--color-border)',
              color: size.is_active ? 'var(--color-success)' : 'var(--color-ink-muted)',
            }}
          >
            {size.is_active ? 'Active' : 'Inactive'}
          </button>
          {size.is_active && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[color:var(--color-surface-raised)]"
              style={{ color: 'var(--color-ink-muted)' }}
              title="Deactivate size"
              aria-label={`Deactivate ${size.name}`}
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
