'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { InquiryStatus } from '@/lib/supabase/types'

type PaymentStatus = 'unpaid' | 'partial' | 'paid'

const fieldStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-ink)',
}

const activeFieldStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderColor: 'var(--color-teal)',
  color: 'var(--color-teal-deep)',
}

export default function InquiryFilterBar({
  q,
  status,
  payment,
  sort,
  dir,
  hasActiveFilters,
  statusOptions,
  paymentOptions,
}: {
  q?: string
  status: string
  payment: string
  sort: string
  dir: string
  hasActiveFilters: boolean
  statusOptions: { value: InquiryStatus | 'all'; label: string }[]
  paymentOptions: { value: PaymentStatus | 'all'; label: string }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      method="GET"
      className="flex flex-wrap items-center gap-2.5 mb-5 p-3 rounded-xl border"
      style={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlass
          size={14}
          weight="bold"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-ink-muted)' }}
        />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or phone…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--color-teal)] focus:ring-2 focus:ring-[var(--color-teal-light)]"
          style={q?.trim() ? activeFieldStyle : fieldStyle}
        />
      </div>
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-2 text-sm font-medium rounded-lg border outline-none transition-colors focus:border-[var(--color-teal)]"
        style={status !== 'all' ? activeFieldStyle : fieldStyle}
      >
        {statusOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        name="payment"
        defaultValue={payment}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-2 text-sm font-medium rounded-lg border outline-none transition-colors focus:border-[var(--color-teal)]"
        style={payment !== 'all' ? activeFieldStyle : fieldStyle}
      >
        {paymentOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {/* Sort lives on the clickable column headers, but rides along so a
          status/payment change doesn't reset it. */}
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="dir" value={dir} />
      {hasActiveFilters && (
        <Link
          href="/admin/inquiries"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-all active:scale-[0.97] hover:bg-[var(--color-teal-light)]"
          style={{ borderColor: 'var(--color-teal)', color: 'var(--color-teal-deep)' }}
        >
          <X size={13} weight="bold" />
          Clear filters
        </Link>
      )}
    </form>
  )
}
