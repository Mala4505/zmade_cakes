import { Skeleton } from '@/components/ui'

/** Mirrors the confirmation page: branded header band, progress row,
 *  order summary card, and the confirm action. */
export default function ConfirmLoading() {
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
          ZMade Cakes
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
        {/* Progress row */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-3" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-3" />
          <Skeleton className="h-3.5 w-14" />
        </div>

        {/* Order summary card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>

        {/* Delivery details card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>

        {/* Confirm button */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </main>
  )
}
