import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode
}

/**
 * Bordered-label checkbox: the whole box is the tap target
 * (matches the dietary-requirement checkboxes in the inquiry form,
 * with a teal-wash highlight when checked).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, ...props }, ref) {
    return (
      <label
        className={cn(
          'flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2.5 border transition-colors',
          'bg-[var(--color-cream)] border-[var(--color-border)]',
          'hover:border-[var(--color-border-strong)]',
          'has-[:checked]:border-[var(--color-teal)] has-[:checked]:bg-[var(--color-teal-light)]',
          'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="accent-[color:var(--color-teal)] w-4 h-4 shrink-0"
          {...props}
        />
        <span className="text-sm font-medium text-[var(--color-ink-secondary)]">
          {label}
        </span>
      </label>
    )
  }
)
