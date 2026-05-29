'use client'

import { useState } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import InquiryImageSection from './InquiryImageSection'

export default function CollapsibleImages({
  inquiryId,
  initialImages,
}: {
  inquiryId: string
  initialImages: any[]
}) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full"
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Reference Images
        </span>
        {open
          ? <CaretUp size={14} style={{ color: 'var(--color-ink-muted)' }} />
          : <CaretDown size={14} style={{ color: 'var(--color-ink-muted)' }} />}
      </button>

      {open && (
        <div className="mt-3">
          <InquiryImageSection initialImages={initialImages} inquiryId={inquiryId} />
        </div>
      )}
    </div>
  )
}
