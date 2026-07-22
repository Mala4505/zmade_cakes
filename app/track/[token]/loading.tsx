import { Skeleton } from '@/components/ui'
import { BRAND_NAME } from '@/lib/brand'

/** Mirrors the tracking page: branded header band, status timeline,
 *  and the order summary card. */
export default function TrackLoading() {
  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Static branded header (matches the real page) */}
      <header
        className="border-b px-5 py-5 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-teal)' }}
        >
          {BRAND_NAME}
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Status timeline */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>

        {/* Order summary card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
