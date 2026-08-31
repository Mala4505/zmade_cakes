'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Spinner } from '@phosphor-icons/react'
import { updateInquiryStatus } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { Inquiry, InquiryStatus } from '@/lib/supabase/types'
import { pendingRecordLabel } from '@/lib/format'

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: 'pending', label: 'Inquired' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLE: Record<InquiryStatus, { bg: string; color: string }> = {
  pending: { bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
  confirmed: { bg: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' },
  delivered: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  cancelled: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' },
}

export function InquiryStatusSelect({
  inquiryId,
  value,
  source,
}: {
  inquiryId: string
  value: InquiryStatus
  source?: Inquiry['source']
}) {
  // 'pending' is the only stage where Order/Inquiry terminology differs; every other
  // status label is unambiguous regardless of source (see pendingRecordLabel).
  const labelFor = (status: InquiryStatus) =>
    status === 'pending' && source
      ? pendingRecordLabel(source)
      : STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<InquiryStatus>(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(value)
        setEditing(false)
      }
    }
    const clickHandler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSelected(value)
        setEditing(false)
      }
    }
    document.addEventListener('keydown', handler)
    document.addEventListener('mousedown', clickHandler)
    return () => {
      document.removeEventListener('keydown', handler)
      document.removeEventListener('mousedown', clickHandler)
    }
  }, [editing, value])

  // A failed update — server-returned error OR a thrown one — must roll the widget back
  // to its committed state: restore the dropdown to `value` and leave edit mode. Before,
  // the throw path did neither, pinning the widget open with a stale selection.
  const revertUi = () => {
    setSelected(value)
    setEditing(false)
  }

  const { run: confirmStatus, pending } = useAsyncAction(
    async () => {
      if (selected === value) {
        setEditing(false)
        return false
      }
      try {
        const result = await updateInquiryStatus(inquiryId, selected)
        if (result.error) {
          revertUi()
          return { error: result.error }
        }
        setEditing(false)
      } catch (err) {
        revertUi()
        throw err
      }
    },
    {
      successToast: 'Status updated',
      onSuccess: () => router.refresh(),
    }
  )

  const handleConfirm = () => confirmStatus()

  const style = STATUS_STYLE[value]

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setEditing(true) }}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
        style={{ backgroundColor: style.bg, color: style.color }}
        title="Click to change status"
      >
        {labelFor(value)}
      </button>
    )
  }

  return (
    <div ref={wrapperRef} className="flex items-center gap-1.5" onClick={e => e.preventDefault()}>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value as InquiryStatus)}
        autoFocus
        className="text-xs rounded-md border px-1.5 py-0.5 outline-none focus:ring-1"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-ink)',
        }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{labelFor(o.value)}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={pending}
        className="flex items-center justify-center w-6 h-6 rounded-md transition-all active:scale-[0.97] disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        title="Confirm"
      >
        {pending
          ? <Spinner size={12} className="animate-spin" />
          : <Check size={12} weight="bold" />
        }
      </button>
    </div>
  )
}
