import { Skeleton } from '@/components/ui'
import { Navbar } from '@/components/public/Navbar'

/** Mirrors the tracking page: left-aligned Navbar, greeting, the horizontal
 *  step tracker (circles + connectors, not a vertical timeline), and the
 *  order details card. Shape must match `page.tsx` exactly so there's no
 *  layout jump when the real content mounts. */
export default function TrackLoading() {
  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Greeting */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3.5 w-56 mt-1" />
        </div>

        {/* Horizontal step tracker */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="flex flex-row items-start">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center">
                <div className="flex items-center w-full">
                  <div
                    className="flex-1 h-0.5"
                    style={{ backgroundColor: i === 0 ? 'transparent' : 'var(--color-border)' }}
                  />
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div
                    className="flex-1 h-0.5"
                    style={{ backgroundColor: i === 2 ? 'transparent' : 'var(--color-border)' }}
                  />
                </div>
                <div className="mt-2 px-1 flex flex-col items-center gap-1">
                  <Skeleton className="h-3.5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order details card */}
        <div
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
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
