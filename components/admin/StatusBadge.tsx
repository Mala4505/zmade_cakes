import { cn } from '@/lib/utils'
import type { InquiryStatus, OrderStatus } from '@/lib/supabase/types'

type Status = InquiryStatus | OrderStatus

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; color: string }
> = {
  pending:                { label: 'Pending',              bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
  awaiting_confirmation:  { label: 'Awaiting Confirm.',    bg: 'var(--color-warning-light)',  color: 'var(--color-warning)'   },
  confirmed:              { label: 'Confirmed',            bg: 'var(--color-teal-light)',     color: 'var(--color-teal-deep)' },
  in_progress:            { label: 'Making',               bg: 'var(--color-info-light)',     color: 'var(--color-info)'      },
  ready:                  { label: 'Ready',                bg: 'var(--color-success-light)',  color: 'var(--color-success)'   },
  delivered:              { label: 'Delivered',            bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
  cancelled:              { label: 'Cancelled',            bg: 'var(--color-danger-light)',   color: 'var(--color-danger)'    },
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

const PRIORITY_CONFIG = {
  0: { label: null,     color: null },
  1: { label: 'High',   color: 'var(--color-warning)' },
  2: { label: 'Urgent', color: 'var(--color-danger)' },
}

export function PriorityBadge({ priority }: { priority: 0 | 1 | 2 }) {
  const cfg = PRIORITY_CONFIG[priority]
  if (!cfg.label) return null
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: priority === 2 ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
        color: cfg.color!,
      }}
    >
      {cfg.label}
    </span>
  )
}
