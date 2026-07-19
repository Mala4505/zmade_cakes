import { forwardRef } from 'react'
import { CaretDown } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { inputBaseClass } from './Input'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(inputBaseClass, 'appearance-none pr-9', className)}
          {...props}
        >
          {children}
        </select>
        <CaretDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
      </div>
    )
  }
)
