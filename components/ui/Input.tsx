import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Font-size variant for Input, Select, and Textarea.
 * 'sm' renders 16px on phones and 14px from `md` up — the admin shell stays
 * dense on desktop, but a focused sub-16px input triggers an unrecoverable
 * auto-zoom on iOS Safari, so touch screens always get 16px.
 * 'base' is a flat 16px everywhere (customer-facing routes, or admin fields
 * that want the larger size on desktop too).
 */
export type InputSize = 'sm' | 'base'

const sizeClass: Record<InputSize, string> = {
  sm: 'text-base md:text-sm',
  base: 'text-base',
}

/**
 * Shared field chrome for Input, Select, and Textarea.
 * Mirrors the canonical `inputClass` used across admin forms:
 * cream background, hairline border, 8px+ radius, quiet focus glow.
 * Font size is intentionally excluded here — callers append `sizeClass[size]`.
 */
export const inputBaseClass = cn(
  'w-full rounded-lg border px-3.5 py-2.5 outline-none transition-all',
  'bg-[var(--color-cream)] border-[var(--color-border)] text-[var(--color-ink)]',
  'placeholder:text-[var(--color-ink-muted)]',
  'focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_var(--color-teal-light)]',
  'disabled:bg-[var(--color-surface-raised)] disabled:text-[var(--color-ink-muted)] disabled:cursor-not-allowed',
  'aria-invalid:border-[var(--color-danger)]'
)

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  /** Text size variant. Defaults to 'sm' (16px on phones, 14px on desktop). Pass 'base' for a flat 16px everywhere. */
  size?: InputSize
  /**
   * Short glyph ('+', '−', 'KD'…) fused to the input's leading edge. Used on money
   * fields so the sign of what a value does to a total is visible without reading
   * the label — see the admin Pricing & Payment card.
   */
  prefix?: React.ReactNode
  /** Tints the prefix box. 'minus' reads as a subtraction (discount), 'plus' as an addition (delivery). */
  prefixTone?: 'neutral' | 'plus' | 'minus'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'sm', prefix, prefixTone = 'neutral', ...props },
  ref
) {
  if (prefix === undefined) {
    return <input ref={ref} className={cn(inputBaseClass, sizeClass[size], className)} {...props} />
  }

  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <div
      className={cn(
        'flex items-stretch rounded-lg border overflow-hidden transition-all',
        'bg-[var(--color-cream)]',
        invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
        'focus-within:border-[var(--color-border-strong)] focus-within:shadow-[0_0_0_3px_var(--color-teal-light)]',
        props.disabled && 'opacity-60'
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center px-2.5 shrink-0 border-r font-[family-name:var(--font-mono)]',
          'border-[var(--color-border)] bg-[var(--color-surface-raised)]',
          sizeClass[size],
          prefixTone === 'minus' ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-muted)]'
        )}
      >
        {prefix}
      </span>
      <input
        ref={ref}
        className={cn(
          'flex-1 min-w-0 px-3.5 py-2.5 outline-none bg-transparent text-[var(--color-ink)]',
          'placeholder:text-[var(--color-ink-muted)]',
          'font-[family-name:var(--font-mono)]',
          sizeClass[size],
          className
        )}
        {...props}
      />
    </div>
  )
})
