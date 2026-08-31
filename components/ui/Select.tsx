import { forwardRef } from 'react'
import { CaretDown } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { inputBaseClass, type InputSize } from './Input'

const sizeClass: Record<InputSize, string> = {
  sm: 'text-base md:text-sm',
  base: 'text-base',
}

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  /** Text size variant. Defaults to 'sm' (16px on phones, 14px on desktop). Pass 'base' for a flat 16px everywhere. */
  size?: InputSize
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, size = 'sm', ...props }, ref) {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(inputBaseClass, sizeClass[size], 'appearance-none pr-9', className)}
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
