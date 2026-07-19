import { Skeleton } from '@/components/ui'

/** Covers the settings index and any child section without its own
 *  loading file; renders inside the settings sidebar layout. */
export default function SettingsLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Page header */}
      <div className="mb-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-3.5 w-56" />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        ))}
      </div>
    </div>
  )
}
