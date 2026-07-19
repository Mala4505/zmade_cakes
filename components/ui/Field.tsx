import { cn } from '@/lib/utils'

export interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

/**
 * Label + control + error wrapper. Matches the canonical `Field`
 * pattern from the admin inquiry forms.
 */
export function Field({
  label,
  error,
  hint,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium mb-1.5 text-[var(--color-ink-muted)]"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-[color:var(--color-danger)]">*</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
