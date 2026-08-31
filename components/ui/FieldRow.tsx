import { cn } from '@/lib/utils'

/**
 * `grid-cols-1 sm:grid-cols-2` as a class string, for spots that need it inline
 * (conditionally, alongside other classes) rather than as a wrapper element.
 */
export const fieldRowClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4'

export interface FieldRowProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Two-column field grid that collapses to one column below `sm`. Replaces the
 * hard-coded `grid grid-cols-2 gap-4` rows that never collapsed on a phone —
 * pair with `sm:col-span-2` (not `col-span-2`) on any child meant to span
 * the full row.
 */
export function FieldRow({ className, ...props }: FieldRowProps) {
  return <div className={cn(fieldRowClass, className)} {...props} />
}
