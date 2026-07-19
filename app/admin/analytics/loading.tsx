import { Skeleton } from '@/components/ui'

/* Deterministic bar heights so the chart skeleton reads as a chart. */
const BAR_HEIGHTS = [35, 55, 40, 70, 48, 85, 60, 45, 75, 52, 90, 65]

export default function AnalyticsLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Header + export button */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Revenue bar chart */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-end gap-1" style={{ height: '120px' }}>
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                <div className="flex-1 w-full flex items-end">
                  <Skeleton className="w-full rounded-t rounded-b-none" style={{ height: `${h}%` }} />
                </div>
                <Skeleton className="h-2 w-6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2"
          >
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Top flavors / sizes */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, s) => (
          <div
            key={s}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="px-4 py-2">
              {Array.from({ length: 4 }).map((_, r) => (
                <div
                  key={r}
                  className="flex items-center justify-between py-2.5 border-b last:border-0 border-[var(--color-border)]"
                >
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
