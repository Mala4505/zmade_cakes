import { cn } from '@/lib/utils'

/**
 * Base skeleton block. Static (no pulse) for users who prefer
 * reduced motion. Compose freely, or use the route-shaped variants
 * below inside `loading.tsx` files.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'motion-safe:animate-pulse rounded-md bg-[var(--color-surface-raised)]',
        className
      )}
      style={style}
    />
  )
}

const card = 'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]'

/* Deterministic width variation so rows read as content, not stripes. */
const CELL_WIDTHS = ['w-28', 'w-20', 'w-24', 'w-16', 'w-32', 'w-14']

/** Header row + N row skeletons, shaped like the admin list tables. */
export function SkeletonTable({
  rows = 6,
  cols = 4,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn(card, 'overflow-hidden', className)}>
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3', CELL_WIDTHS[i % CELL_WIDTHS.length])} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-[var(--color-border)] px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-3.5', CELL_WIDTHS[(r + c) % CELL_WIDTHS.length])}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Column skeletons with stacked cards, shaped like the orders kanban. */
export function SkeletonKanban({
  columns = 4,
  cardsPerColumn = 3,
  className,
}: {
  columns?: number
  cardsPerColumn?: number
  className?: string
}) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="rounded-xl bg-[var(--color-surface-raised)] p-3">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-20 bg-[var(--color-border)]" />
            <Skeleton className="h-4 w-6 rounded-full bg-[var(--color-border)]" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: cardsPerColumn }).map((_, i) => (
              <div key={i} className={cn(card, 'flex flex-col gap-2 p-3')}>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Toolbar + month grid, shaped like the calendar route. */
export function SkeletonCalendar({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className={cn(card, 'overflow-hidden')}>
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center py-2.5">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, week) => (
          <div
            key={week}
            className="grid grid-cols-7 border-b border-[var(--color-border)] last:border-b-0"
          >
            {Array.from({ length: 7 }).map((_, day) => (
              <div
                key={day}
                className="h-20 border-r border-[var(--color-border)] p-2 last:border-r-0"
              >
                <Skeleton className="h-3 w-5" />
                {(week * 7 + day) % 3 === 0 && (
                  <Skeleton className="mt-2 h-3.5 w-full" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Label + input block skeletons, shaped like the admin forms. */
export function SkeletonForm({
  fields = 6,
  className,
}: {
  fields?: number
  className?: string
}) {
  return (
    <div className={cn(card, 'p-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className={cn(i % 5 === 4 && 'col-span-2')}>
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-11 w-full rounded-lg" />
    </div>
  )
}

/** Stacked list-card skeletons, shaped like inquiry/order card lists. */
export function SkeletonCards({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(card, 'p-4')}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
