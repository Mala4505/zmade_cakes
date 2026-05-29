'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Spinner } from '@phosphor-icons/react'
import { updateInquiryStatus } from '@/lib/actions/inquiries'
import { toast } from 'sonner'
import type { InquiryStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS: { value: InquiryStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'awaiting_confirmation', label: 'Awaiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'Making' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLE: Record<InquiryStatus, { bg: string; color: string }> = {
  pending: { bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
  awaiting_confirmation: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
  confirmed: { bg: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' },
  in_progress: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
  ready: { bg: '#f0e6ff', color: '#6b21a8' },
  delivered: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  cancelled: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' },
}

export function InquiryStatusSelect({
  inquiryId,
  value,
}: {
  inquiryId: string
  value: InquiryStatus
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<InquiryStatus>(value)
  const [pending, startTransition] = useTransition()
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

  const handleConfirm = () => {
    if (selected === value) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiryId, selected)
      if (result.error) {
        toast.error(result.error)
        setSelected(value)
      } else {
        toast.success('Status updated')
        router.refresh()
      }
      setEditing(false)
    })
  }

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
        {STATUS_OPTIONS.find(o => o.value === value)?.label ?? value}
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
          focusRingColor: 'var(--color-teal)',
        }}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
