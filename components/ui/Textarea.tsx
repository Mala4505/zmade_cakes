import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { inputBaseClass, type InputSize } from './Input'

const sizeClass: Record<InputSize, string> = {
  sm: 'text-sm',
  base: 'text-base',
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Text size variant. Defaults to 'sm' (14px, admin default). Pass 'base' on customer routes to prevent iOS zoom. */
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
