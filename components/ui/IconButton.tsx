import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

export type IconButtonTone = 'default' | 'muted' | 'danger' | 'accent'

const TONE_CLASSES: Record<IconButtonTone, string> = {
  default: 'text-[var(--color-ink-secondary)] enabled:hover:bg-[var(--color-surface-raised)]',
  muted: 'text-[var(--color-ink-muted)] enabled:hover:bg-[var(--color-surface-raised)] enabled:hover:text-[var(--color-ink-secondary)]',
  danger: 'text-[var(--color-danger)] enabled:hover:bg-[var(--color-danger-light)]',
  accent: 'text-[var(--color-teal)] enabled:hover:bg-[var(--color-teal-light)]',
}

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  tone?: IconButtonTone
  /** Shows the shared Spinner in place of `children` and disables the button. */
  loading?: boolean
  /**
   * IconButton renders no visible label, so an accessible name isn't optional —
   * every call site must supply one.
   */
  'aria-label': string
}

/**
 * The 44×44 touch-target box for icon-only controls (row actions, close
 * buttons, drag handles). Renders at full size regardless of how small the
 * glyph inside it is — pull it flush to an edge the same way AdminNav does,
 * with a matching negative margin (`-m-2.5` etc.) on the call site, not here,
 * since how much to pull back depends on what's next to it.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { tone = 'default', loading = false, disabled, className, children, type = 'button', ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-lg transition-all active:scale-[0.94]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          TONE_CLASSES[tone],
          className
        )}
        {...props}
      >
        {loading ? <Spinner size={15} /> : children}
      </button>
    )
  }
)
