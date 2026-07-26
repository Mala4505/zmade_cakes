import { Skeleton } from '@/components/ui'

/** Mirrors the products shell: top tab bar + (mobile) single list /
 *  (desktop) list rail beside the editor pane. Keeps the load-in from
 *  shifting layout when the real content arrives. */
export default function ProductsLoading() {
  return (
    <div className="flex flex-col md:h-svh md:overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2 shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      <div className="flex flex-1 md:min-h-0">
        {/* List rail */}
        <div
          className="w-full md:w-64 shrink-0 md:border-r p-2 flex flex-col gap-1"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2" style={{ minHeight: 56 }}>
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>

        {/* Editor pane — desktop only */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
    </div>
  )
}
