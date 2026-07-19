import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'neutral'
  | 'teal'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)]',
  teal: 'bg-[var(--color-teal-light)] text-[var(--color-teal-deep)]',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
}

export interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

/** Pill-shaped, read-only status communicator. */
export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
