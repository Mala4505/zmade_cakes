import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { InquiryStatus, OrderStatus } from '@/lib/supabase/types'

type Status = InquiryStatus | OrderStatus

const STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  pending:                { label: 'Pending',           variant: 'neutral' },
  awaiting_confirmation:  { label: 'Awaiting Confirm.', variant: 'warning' },
  confirmed:              { label: 'Confirmed',         variant: 'teal'    },
  in_progress:            { label: 'Making',            variant: 'info'    },
  ready:                  { label: 'Ready',             variant: 'success' },
  delivered:              { label: 'Delivered',         variant: 'neutral' },
  cancelled:              { label: 'Cancelled',         variant: 'danger'  },
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
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  )
}

const PRIORITY_CONFIG: Record<
  1 | 2,
  { label: string; variant: BadgeVariant }
> = {
  1: { label: 'High',   variant: 'warning' },
  2: { label: 'Urgent', variant: 'danger'  },
}

export function PriorityBadge({ priority }: { priority: 0 | 1 | 2 }) {
  if (priority === 0) return null
  const cfg = PRIORITY_CONFIG[priority]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
