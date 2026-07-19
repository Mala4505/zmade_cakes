import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared field chrome for Input, Select, and Textarea.
 * Mirrors the canonical `inputClass` used across admin forms:
 * cream background, hairline border, 8px+ radius, quiet focus glow.
 */
export const inputBaseClass = cn(
  'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all',
  'bg-[var(--color-cream)] border-[var(--color-border)] text-[var(--color-ink)]',
  'placeholder:text-[var(--color-ink-muted)]',
  'focus:border-[var(--color-border-strong)] focus:shadow-[0_0_0_3px_var(--color-teal-light)]',
  'disabled:bg-[var(--color-surface-raised)] disabled:text-[var(--color-ink-muted)] disabled:cursor-not-allowed',
  'aria-invalid:border-[var(--color-danger)]'
)

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(inputBaseClass, className)} {...props} />
})
