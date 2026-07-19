'use client'

import { useState, useRef } from 'react'
import { updateCustomerNotes, updateCustomerVip } from '@/lib/actions/customers'
import { toast } from 'sonner'

interface Props {
  customerId: string
  initialNotes: string
  initialVip: boolean
}

export default function CustomerDetail({ customerId, initialNotes, initialVip }: Props) {
  const [vip, setVip] = useState(initialVip)
  const [notes, setNotes] = useState(initialNotes)
  const [saved, setSaved] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSaved() {
    setSaved(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  async function handleVipToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked
    setVip(next)
    const result = await updateCustomerVip(customerId, next)
    if (result.error) {
      setVip(!next)
      toast.error(result.error)
      return
    }
    showSaved()
  }

  async function handleNotesBlur() {
    const result = await updateCustomerNotes(customerId, notes)
    if (result.error) {
      toast.error(result.error)
      return
    }
    showSaved()
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Customer Settings
        </p>
        {saved && (
          <span
            className="text-[11px] font-medium transition-opacity"
            style={{ color: 'var(--color-teal)' }}
          >
            Saved ✓
          </span>
        )}
      </div>

      {/* VIP toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <span
          className="relative inline-flex items-center"
          style={{ width: 40, height: 22 }}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={vip}
            onChange={handleVipToggle}
          />
          <span
            className="block rounded-full transition-colors"
            style={{
              width: 40,
              height: 22,
              backgroundColor: vip ? 'var(--color-teal)' : 'var(--color-border)',
            }}
          />
          <span
            className="absolute left-0.5 top-0.5 block rounded-full transition-transform bg-white"
            style={{
              width: 18,
              height: 18,
              transform: vip ? 'translateX(18px)' : 'translateX(0)',
            }}
          />
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          VIP Customer
        </span>
        {vip && (
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
          >
            ★ VIP
          </span>
        )}
      </label>

      {/* Notes */}
      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Private notes about this customer…"
          className="w-full text-sm rounded-lg border px-3 py-2 resize-none outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-ink)',
          }}
        />
      </div>
    </div>
  )
}
