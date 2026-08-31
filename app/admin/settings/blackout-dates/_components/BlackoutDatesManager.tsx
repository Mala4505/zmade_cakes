'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { X } from '@phosphor-icons/react'
import { createBlackout, deleteBlackout } from '@/lib/actions/settings'
import { Input } from '@/components/ui'
import type { BlackoutDate } from '@/lib/supabase/types'

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

export default function BlackoutDatesManager({
  initialBlackouts,
}: {
  initialBlackouts: BlackoutDate[]
}) {
  const [blackouts, setBlackouts] = useState(initialBlackouts)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no error ever shown.
      try {
        const result = await deleteBlackout(id)
        if (result.error) {
          setDeleteError(result.error)
          return
        }
        setBlackouts((prev) => prev.filter((b) => b.id !== id))
      } catch (err) {
        console.error('[BlackoutDatesManager] delete failed:', err)
        setDeleteError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)

    if (dateTo < dateFrom) {
      setAddError('End date must be on or after start date')
      return
    }

    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `isPending` stuck
      // true forever with no error ever shown.
      try {
        const result = await createBlackout({ date_from: dateFrom, date_to: dateTo, reason })
        if (result.error || !result.data) {
          setAddError(result.error ?? 'Failed to add blackout')
          return
        }
        setBlackouts((prev) => [...prev, result.data!])
        setDateFrom('')
        setDateTo('')
        setReason('')
      } catch (err) {
        console.error('[BlackoutDatesManager] add failed:', err)
        setAddError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div>
      {/* Existing list */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
          Blocked Ranges
        </p>

        {blackouts.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-ink-muted)' }}>
            No blocked dates
          </p>
        ) : (
          <ul className="space-y-2">
            {blackouts.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: 'var(--color-surface-raised)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                    {format(parseISO(b.date_from), 'dd/MM/yyyy')} → {format(parseISO(b.date_to), 'dd/MM/yyyy')}
                  </p>
                  {b.reason && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
                      {b.reason}
                    </p>
                  )}
                </div>
                <IconButton
                  icon={<X size={15} weight="bold" />}
                  label="Delete blackout"
                  onClick={() => handleDelete(b.id)}
                  disabled={isPending}
                  tone="danger"
                />
              </li>
            ))}
          </ul>
        )}

        {deleteError && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
            {deleteError}
          </p>
        )}
      </div>

      {/* Add form */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-ink)' }}>
          Add Blocked Range
        </p>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="date_from"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                From
              </label>
              <Input
                id="date_from"
                type="date"
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                size="base"
              />
            </div>
            <div>
              <label
                htmlFor="date_to"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                To
              </label>
              <Input
                id="date_to"
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                size="base"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Reason (optional)
            </label>
            <Input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Eid holiday"
              size="base"
            />
          </div>

          {addError && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
              {addError}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
