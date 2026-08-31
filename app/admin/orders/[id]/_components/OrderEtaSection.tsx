'use client'

import { useState } from 'react'
import { PencilSimple, Check } from '@phosphor-icons/react'
import { updateOrderEta } from '@/lib/actions/orders'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { formatDateLong, formatTime } from '@/lib/utils'
import { Input } from '@/components/ui'

interface Props {
  orderId: string
  initialDate: string | null
  initialTime: string | null
  initialNote: string
}

export default function OrderEtaSection({ orderId, initialDate, initialTime, initialNote }: Props) {
  const [editing, setEditing] = useState(!initialDate)
  const [date, setDate] = useState(initialDate ?? '')
  const [time, setTime] = useState(initialTime ?? '')
  const [note, setNote] = useState(initialNote)
  const [saved, setSaved] = useState(false)

  const { run: handleSave, pending: isPending, error } = useAsyncAction(
    async () => {
      const result = await updateOrderEta(orderId, {
        eta_date: date || null,
        eta_time: time || null,
        eta_note: note,
      })
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'ETA updated',
      errorToast: false,
      onSuccess: () => {
        setSaved(true)
        setEditing(false)
        setTimeout(() => setSaved(false), 2000)
      },
    }
  )

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          ETA
        </p>
        {!editing && date && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <PencilSimple size={13} />
            Edit
          </button>
        )}
      </div>

      {!editing && date ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            Expected by {formatDateLong(date)}{time ? `, ${formatTime(time)}` : ''}
          </p>
          {note && (
            <p className="text-xs italic" style={{ color: 'var(--color-ink-muted)' }}>{note}</p>
          )}
          {saved && <p className="text-xs" style={{ color: 'var(--color-success, #2d7a3f)' }}>Saved!</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-muted)' }}>Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-muted)' }}>Time</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-muted)' }}>Note (optional)</label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Ready between 3–5 PM"
            />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {saved && <p className="text-xs" style={{ color: 'var(--color-success, #2d7a3f)' }}>Saved!</p>}
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isPending}
            className="py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {isPending ? 'Saving…' : 'Save ETA'}
          </button>
        </div>
      )}
    </div>
  )
}
