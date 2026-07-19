import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { inputBaseClass } from './Input'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(inputBaseClass, 'resize-none', className)}
        {...props}
      />
    )
  }
)
