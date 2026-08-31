'use client'

import { useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import { Input, Button, Spinner, IconButton } from '@/components/ui'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { OptionRow } from '@/lib/supabase/types'
import type { OptionTable } from '@/lib/validations/options'

interface OptionRowListProps {
  table: OptionTable
  /** Lowercase singular noun used in placeholders/labels ("item", "size"). */
  noun: string
  rows: OptionRow[]
  onChanged: (rows: OptionRow[]) => void
  heading: string
  description: string
  className?: string
  /** False when the parent panel already owns the width (e.g. embedded in a tab). */
  constrainWidth?: boolean
}

/**
 * Shared add/toggle/delete list for a flat `OPTION_TABLES` catalog (name +
 * active only). `ItemList` and `SizeList` were near-identical copies of this
 * same flow, differing only in table name and label strings — this is the
 * one place that logic lives now.
 */
export function OptionRowList({ table, noun, rows, onChanged, heading, description, className, constrainWidth = true }: OptionRowListProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const capNoun = noun[0].toUpperCase() + noun.slice(1)

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setError(null)
  }

  const { run: runAdd, pending: isAddPending } = useAsyncAction(
    async (trimmed: string) => {
      const result = await createOption(table, { name: trimmed, sort_order: rows.length, is_active: true })
      if (result.error !== null) {
        setError(result.error)
        return { error: result.error }
      }
      if (result.fieldErrors !== null) {
        setError(result.fieldErrors.name?.[0] ?? `Could not add ${noun}`)
        return false
      }
      onChanged([...rows, result.data])
      setNewName('')
      setError(null)
      setAdding(false)
    },
    { successToast: `${capNoun} added` }
  )

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError(`Enter a ${noun} name`)
      return
    }
    runAdd(trimmed)
  }

  return (
    <div className={className} style={constrainWidth ? { maxWidth: 560 } : undefined}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-ink)' }}>
        {heading}
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
        {description}
      </p>

      <div className="flex flex-col gap-1 mb-3">
        {rows.map((row) => (
          <OptionRow
            key={row.id}
            table={table}
            noun={noun}
            row={row}
            onChanged={(updated) =>
              updated
                ? onChanged(rows.map((r) => (r.id === row.id ? updated : r)))
                : onChanged(rows.filter((r) => r.id !== row.id))
            }
          />
        ))}

        {rows.length === 0 && !adding && (
          <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
            No {noun}s yet. Add one below.
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
              placeholder={`${capNoun} name…`}
              disabled={isAddPending}
              aria-invalid={error ? true : undefined}
              aria-label={`New ${noun} name`}
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
          <span>Add {noun}</span>
        </button>
      )}
    </div>
  )
}

function OptionRow({
  table,
  noun,
  row,
  onChanged,
}: {
  table: OptionTable
  noun: string
  row: OptionRow
  onChanged: (updated: OptionRow | null) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const capNoun = noun[0].toUpperCase() + noun.slice(1)

  const { run: handleToggle, pending: togglePending } = useAsyncAction(
    async () => {
      const result = await updateOption(row.id, table, { is_active: !row.is_active })
      if (result.error) return { error: result.error }
      if (!result.data) return false
      onChanged(result.data)
    },
    { successToast: `${capNoun} updated`, errorToast: `Failed to update ${noun}` }
  )

  const { run: handleDelete, pending: deletePending } = useAsyncAction(
    async () => {
      const result = await deleteOption(row.id, table)
      if (result.error) {
        setConfirmDelete(false)
        return { error: result.error }
      }
      onChanged(null)
    },
    { successToast: `${capNoun} deactivated`, errorToast: `Failed to deactivate ${noun}` }
  )

  const isPending = togglePending || deletePending

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3"
      style={{ minHeight: 48, opacity: row.is_active ? 1 : 0.55 }}
    >
      <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--color-ink)' }}>
        {row.name}
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
              borderColor: row.is_active ? 'var(--color-success)' : 'var(--color-border)',
              color: row.is_active ? 'var(--color-success)' : 'var(--color-ink-muted)',
            }}
          >
            {row.is_active ? 'Active' : 'Inactive'}
          </button>
          {row.is_active && (
            <IconButton
              onClick={() => setConfirmDelete(true)}
              tone="danger"
              aria-label={`Deactivate ${row.name}`}
            >
              <Trash size={14} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  )
}
