import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { Inquiry, InquiryStatus, OrderStatus, PaymentStatus } from '@/lib/supabase/types'
import { pendingRecordLabel } from '@/lib/format'

type Status = InquiryStatus | OrderStatus

// Admin and customer now share identical wording end to end (no more admin-only "Dispatched"
// vs customer-facing "Delivered" split — that distinction was confusing and has been dropped).
// The two configs are kept separate because call sites still pass a `context` prop and may
// diverge again later; today they resolve to the same labels. The 'pending' label below is
// the fallback used when no `source` is passed in — pass `source` to get the record-accurate
// "Order" / "Inquiry" wording via pendingRecordLabel() instead.
const ADMIN_STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  pending:                { label: 'Inquired',          variant: 'neutral' },
  confirmed:              { label: 'Confirmed',         variant: 'teal'    },
  delivered:              { label: 'Delivered',         variant: 'neutral' },
  cancelled:              { label: 'Cancelled',         variant: 'danger'  },
}

const CUSTOMER_STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  ...ADMIN_STATUS_CONFIG,
}

export function StatusBadge({
  status,
  source,
  className,
  context = 'admin',
}: {
  status: Status
  source?: Inquiry['source']
  className?: string
  context?: 'admin' | 'customer'
}) {
  const config = context === 'customer' ? CUSTOMER_STATUS_CONFIG : ADMIN_STATUS_CONFIG
  const cfg = config[status] ?? config.pending
  const label = status === 'pending' && source ? pendingRecordLabel(source) : cfg.label
  return (
    <Badge variant={cfg.variant} className={className}>
      {label}
    </Badge>
  )
}

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  unpaid:  { label: 'Unpaid',       variant: 'neutral' },
  partial: { label: 'Deposit paid', variant: 'warning' },
  paid:    { label: 'Fully paid',   variant: 'success' },
}

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  const cfg = PAYMENT_CONFIG[status]
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  )
}
