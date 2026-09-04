'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART } from '@/lib/motion'
import { PencilSimple } from '@phosphor-icons/react'
import { updateOrderEta } from '@/lib/actions/orders'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { formatDateLong, formatTime } from '@/lib/utils'
import { Checkbox, Input, TimeScrollPicker } from '@/components/ui'

interface Props {
  orderId: string
  initialDate: string | null
  initialTime: string | null
  initialNote: string
}

export default function OrderEtaSection({ orderId, initialDate, initialTime, initialNote }: Props) {
  const reduceMotion = useReducedMotion()
  const [hasEta, setHasEta] = useState(!!initialDate)
  const [editing, setEditing] = useState(!initialDate)
  const [date, setDate] = useState(initialDate ?? '')
  const [time, setTime] = useState(initialTime ?? '')
  const [note, setNote] = useState(initialNote)
  const [saved, setSaved] = useState(false)

  const { run: saveEta, pending: isPending, error } = useAsyncAction(
    async (nextDate: string, nextTime: string, nextNote: string) => {
      const result = await updateOrderEta(orderId, {
        eta_date: nextDate || null,
        eta_time: nextTime || null,
        eta_note: nextNote,
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

  const handleToggle = (checked: boolean) => {
    setHasEta(checked)
    if (!checked) {
      // Same-tick clear as the dietary checkbox's un-check, except this card has no
      // outer form/submit to defer to — clearing the box has to persist right away
      // or unchecking would silently do nothing to a previously-saved ETA.
      if (date) saveEta('', '', '')
      setDate('')
      setTime('')
      setNote('')
      setEditing(true)
    } else {
      setEditing(!date)
    }
  }

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <Checkbox checked={hasEta} onChange={(e) => handleToggle(e.target.checked)} label="This order has an ETA" />

      <AnimatePresence initial={false}>
        {hasEta && (
          <motion.div
            key="eta-fields"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
            className="overflow-hidden"
          >
            {!editing && date ? (
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    Expected by {formatDateLong(date)}
                    {time ? `, ${formatTime(time)}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--color-ink-muted)' }}
                  >
                    <PencilSimple size={13} />
                    Edit
                  </button>
                </div>
                {note && (
                  <p className="text-xs italic" style={{ color: 'var(--color-ink-muted)' }}>{note}</p>
                )}
                {saved && <p className="text-xs" style={{ color: 'var(--color-success, #2d7a3f)' }}>Saved!</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-3">
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
                    <TimeScrollPicker value={time} onChange={setTime} />
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
                  onClick={() => saveEta(date, time, note)}
                  disabled={isPending}
                  className="py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
                >
                  {isPending ? 'Saving…' : 'Save ETA'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
