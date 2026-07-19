import { Skeleton } from '@/components/ui'

/** Dashboard-shaped loading state: header, quick actions, stat cards,
 *  monthly stats, and the two section lists. */
export default function AdminDashboardLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-3.5 w-48" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2"
          >
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Monthly stats */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden mb-8">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="px-5 py-4 flex flex-col gap-2 border-b sm:border-b-0 sm:border-r last:border-0 border-[var(--color-border)]"
            >
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Section lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, s) => (
          <div
            key={s}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="px-4">
              {Array.from({ length: 3 }).map((_, r) => (
                <div
                  key={r}
                  className="flex items-start justify-between py-3 border-b last:border-0 border-[var(--color-border)]"
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
