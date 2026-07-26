import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-teal)] text-[var(--color-cream)] enabled:hover:bg-[var(--color-teal-deep)]',
  secondary:
    'bg-[var(--color-surface-raised)] text-[var(--color-ink-secondary)] border border-transparent enabled:hover:border-[var(--color-border-strong)]',
  ghost:
    'bg-transparent text-[var(--color-ink-secondary)] enabled:hover:bg-[var(--color-surface-raised)]',
  danger:
    'bg-[var(--color-danger)] text-[var(--color-cream)] enabled:hover:brightness-95',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows the shared Spinner and disables the button. */
  loading?: boolean
  /**
   * Escape hatch for external links (e.g. WhatsApp) that must look like a
   * primary CTA. When set, renders an `<a target="_blank">` with the exact
   * same computed className instead of a `<button>`. Everything else about
   * the component's API stays the same.
   */
  href?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      children,
      type = 'button',
      href,
      ...props
    },
    ref
  ) {
    const classes = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-all',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      className
    )

    if (href) {
      return (
        <a
          ref={ref as unknown as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {loading && <Spinner size={size === 'sm' ? 12 : 14} className="shrink-0" />}
          {children}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classes}
        {...props}
      >
        {loading && <Spinner size={size === 'sm' ? 12 : 14} className="shrink-0" />}
        {children}
      </button>
    )
  }
)
