'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { X } from '@phosphor-icons/react'
import { createBlackout, deleteBlackout } from '@/lib/actions/settings'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { BlackoutDate } from '@/lib/supabase/types'

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

  const { run: runDelete, pending: deleting } = useAsyncAction(
    async (id: string) => {
      const result = await deleteBlackout(id)
      if (result.error) return { error: result.error }
      setBlackouts((prev) => prev.filter((b) => b.id !== id))
    },
    { successToast: 'Removed' }
  )

  const { run: runAdd, pending: adding } = useAsyncAction(
    async () => {
      const result = await createBlackout({ date_from: dateFrom, date_to: dateTo, reason })
      if (result.error || !result.data) return { error: result.error ?? 'Failed to add blackout' }
      setBlackouts((prev) => [...prev, result.data!])
      setDateFrom('')
      setDateTo('')
      setReason('')
    },
    { successToast: 'Date blocked' }
  )

  const busy = adding || deleting

  function handleDelete(id: string) {
    runDelete(id)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)

    if (dateTo < dateFrom) {
      setAddError('End date must be on or after start date')
      return
    }

    runAdd()
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
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  disabled={busy}
                  className="shrink-0 p-1 rounded transition-opacity disabled:opacity-40"
                  style={{ color: 'var(--color-danger)' }}
                  aria-label="Delete blackout"
                >
                  <X size={15} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="date_from"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                From
              </label>
              <input
                id="date_from"
                type="date"
                required
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-cream)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-ink)',
                }}
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
              <input
                id="date_to"
                type="date"
                required
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-cream)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-ink)',
                }}
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
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Eid holiday"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--color-cream)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            />
          </div>

          {addError && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
              {addError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
