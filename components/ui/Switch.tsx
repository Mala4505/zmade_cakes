import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode
  description?: React.ReactNode
}

/**
 * Track-and-thumb toggle switch: a native checkbox (role="switch") drives
 * `group-has-[:checked]` styling on the track/thumb (the checkbox is a
 * sibling of those spans, not their descendant, so `has-[:checked]` alone
 * can't target them directly — `group` on their shared parent bridges that,
 * mirroring Checkbox's pattern of keeping the real input as the interactive
 * element, visually hidden but not display:none so focus/keyboard toggling
 * keep working).
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  function Switch({ label, description, className, ...props }, ref) {
    return (
      <label
        className={cn(
          'flex items-center justify-between gap-3 cursor-pointer',
          'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
          className
        )}
      >
        <span className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-ink-secondary)]">
            {label}
          </span>
          {description ? (
            <span className="text-xs text-[var(--color-ink-muted)]">
              {description}
            </span>
          ) : null}
        </span>

        <span className="group relative inline-flex shrink-0 items-center w-9 h-5">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            className="absolute inset-0 opacity-0 cursor-pointer"
            {...props}
          />
          <span
            className={cn(
              'absolute inset-0 rounded-full transition-colors',
              'bg-[var(--color-border-strong)]',
              'group-has-[:checked]:bg-[var(--color-teal)]'
            )}
          />
          <span
            className={cn(
              'absolute left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              'group-has-[:checked]:translate-x-4'
            )}
          />
        </span>
      </label>
    )
  }
)
