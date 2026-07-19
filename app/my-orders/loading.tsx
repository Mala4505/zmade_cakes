import { Skeleton } from '@/components/ui'

/** Mirrors the my-orders lookup page: branded header band and the
 *  name/phone search form. */
export default function MyOrdersLoading() {
  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      {/* Static branded header */}
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
        {/* Page intro */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>

        {/* Lookup form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-4">
          <div>
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </main>
  )
}
