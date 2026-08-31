import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { inputBaseClass, type InputSize } from './Input'

const sizeClass: Record<InputSize, string> = {
  sm: 'text-base md:text-sm',
  base: 'text-base',
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Text size variant. Defaults to 'sm' (16px on phones, 14px on desktop). Pass 'base' for a flat 16px everywhere. */
  size?: InputSize
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 3, size = 'sm', ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(inputBaseClass, sizeClass[size], 'resize-none', className)}
        {...props}
      />
    )
  }
)
