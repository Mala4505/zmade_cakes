import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Font-size variant for Input, Select, and Textarea.
 * 'sm' (14px) is the long-standing admin default — dense, phone-first daily tool.
 * 'base' (16px) is required on customer-facing routes: any focused input under
 * 16px triggers an ugly auto-zoom on iOS Safari.
 */
export type InputSize = 'sm' | 'base'

const sizeClass: Record<InputSize, string> = {
  sm: 'text-sm',
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
  /** Text size variant. Defaults to 'sm' (14px, admin default). Pass 'base' on customer routes to prevent iOS zoom. */
  size?: InputSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'sm', ...props },
  ref
) {
  return <input ref={ref} className={cn(inputBaseClass, sizeClass[size], className)} {...props} />
})
