'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { InquiryStatus } from '@/lib/supabase/types'

type Tab = { value: InquiryStatus | 'all'; label: string }

export default function InquiryStatusTabs({
  tabs,
  activeStatus,
  counts = {},
}: {
  tabs: Tab[]
  activeStatus: string
  counts?: Record<string, number>
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map(({ value, label }) => {
        const active = value === activeStatus
        return (
          <Link
            key={value}
            href={value === 'all' ? '/admin/inquiries' : `/admin/inquiries?status=${value}`}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              active
                ? 'text-[color:var(--color-teal)]'
                : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink-secondary)]'
            )}
            style={
              active
                ? { backgroundColor: 'var(--color-teal-light)' }
                : { backgroundColor: 'var(--color-surface)' }
            }
          >
            {label}
            {counts[value] !== undefined && counts[value] > 0 && (
              <span
                className="ml-1.5 text-[10px] font-bold"
                style={{ color: active ? 'var(--color-teal-deep)' : 'var(--color-ink-muted)' }}
              >
                {counts[value]}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
