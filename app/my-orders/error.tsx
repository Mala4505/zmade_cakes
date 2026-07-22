'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui'
import { BRAND_NAME } from '@/lib/brand'

/** No segment layout here, so the boundary carries the branded page shell. */
export default function MyOrdersError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset: () => void
  unstable_retry?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
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

      <div className="mx-auto flex min-h-[60svh] max-w-lg items-center justify-center px-4">
        <ErrorState
          title="We couldn't load your orders"
          description="Something went wrong on our side. Please try again, or reach out to us on WhatsApp if it keeps happening."
          onRetry={() => (unstable_retry ?? reset)()}
        />
      </div>
    </main>
  )
}
