import { Skeleton } from '@/components/ui'
import { Navbar } from '@/components/public/Navbar'

/** Mirrors the receipt page: print/download buttons, then the printer body that
 *  the receipt feeds out of (components/receipt/ReceiptPrinter.tsx). The paper
 *  itself isn't skeletonised — on first view it prints in, so an empty slot
 *  is the honest preview. */
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

        {/* Printer body */}
        <div className="flex w-full flex-col items-center">
          <div
            className="w-full max-w-sm rounded-3xl p-3 pb-8"
            style={{ backgroundColor: 'var(--color-forest)' }}
          >
            <div className="h-12 rounded-xl" style={{ backgroundColor: '#08130e' }} />
          </div>
        </div>
      </div>
    </main>
  )
}
