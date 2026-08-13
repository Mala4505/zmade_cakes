import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Icon element, e.g. `<Tray size={22} />`. Rendered in a muted circle. */
  icon?: React.ReactNode
  title: string
  description?: string
  /** CTA slot, e.g. a `<Button>` or a link. */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-16',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-ink-muted)]">
          {icon}
        </div>
      )}
      <p
        className="text-base font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
