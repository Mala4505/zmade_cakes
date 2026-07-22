import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { InquiryStatus, OrderStatus, PaymentStatus } from '@/lib/supabase/types'

type Status = InquiryStatus | OrderStatus

// Admin-facing labels: 'delivered' reads as "Dispatched" — the DB value is unchanged, this is
// a UI-only relabel for the admin flow (Confirmed -> Ready -> Dispatched).
const ADMIN_STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  pending:                { label: 'Inquired',          variant: 'neutral' },
  confirmed:              { label: 'Confirmed',         variant: 'teal'    },
  ready:                  { label: 'Ready',             variant: 'success' },
  delivered:              { label: 'Dispatched',        variant: 'neutral' },
  cancelled:              { label: 'Cancelled',         variant: 'danger'  },
}

// Customer-facing labels keep "Delivered" copy — never show "Dispatched" to customers.
const CUSTOMER_STATUS_CONFIG: Record<Status, { label: string; variant: BadgeVariant }> = {
  ...ADMIN_STATUS_CONFIG,
  delivered: { label: 'Delivered', variant: 'neutral' },
}

export function StatusBadge({
  status,
  className,
  context = 'admin',
}: {
  status: Status
  className?: string
  context?: 'admin' | 'customer'
}) {
  const config = context === 'customer' ? CUSTOMER_STATUS_CONFIG : ADMIN_STATUS_CONFIG
  const cfg = config[status] ?? config.pending
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
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
