'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui'

/** No segment layout here, so the boundary carries the branded page shell. */
export default function TrackError({
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
          ZMade Cakes
        </p>
      </header>

      <div className="mx-auto flex min-h-[60svh] max-w-lg items-center justify-center px-4">
        <ErrorState
          title="We couldn't load your tracking page"
          description="Something went wrong on our side. Please try again, or reach out to Zainab on WhatsApp if it keeps happening."
          onRetry={() => (unstable_retry ?? reset)()}
        />
      </div>
    </main>
  )
}
