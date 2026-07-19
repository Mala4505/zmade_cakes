import { WarningCircle } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ErrorStateProps {
  /** Icon element; defaults to a warning icon in a danger-wash circle. */
  icon?: React.ReactNode
  title?: string
  description?: string
  /** Custom action slot; takes precedence over `onRetry`. */
  action?: React.ReactNode
  /** Convenience: renders a "Try again" button (e.g. error.tsx `reset`). */
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  icon,
  title = 'Something went wrong',
  description,
  action,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-16',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-danger-light)] text-[var(--color-danger)]">
        {icon ?? <WarningCircle size={22} weight="bold" />}
      </div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-ink-muted)]">
          {description}
        </p>
      )}
      {(action || onRetry) && (
        <div className="mt-5">
          {action ?? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
