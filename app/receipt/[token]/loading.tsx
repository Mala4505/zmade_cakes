import { Skeleton } from '@/components/ui'
import { Navbar } from '@/components/public/Navbar'

/** Mirrors PaymentReceiptLayout.tsx: teal accent bar, header (brand + RECEIPT mark),
 *  order reference rows, payment rows, balance rows. Shorter than the invoice skeleton
 *  since a receipt has fewer sections. */
export default function PaymentReceiptLoading() {
  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Print / download buttons */}
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Receipt card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div style={{ height: 4, backgroundColor: 'var(--color-teal)', width: '100%' }} />

          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />

          {/* Order reference */}
          <div className="px-6 pt-4 pb-2 flex flex-col gap-3">
            <Skeleton className="h-3 w-28 mb-1" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 24px' }} />

          {/* Payment */}
          <div className="px-6 pt-4 pb-5 flex flex-col gap-3">
            <Skeleton className="h-3 w-20 mb-1" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
