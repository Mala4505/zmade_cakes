'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui'

/** Renders inside the order layout, which keeps the ZMade header/footer. */
export default function OrderError({
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
    <ErrorState
      title="We couldn't load the inquiry form"
      description="Something went wrong on our side. Please try again, or reach out to us on WhatsApp if it keeps happening."
      onRetry={() => (unstable_retry ?? reset)()}
    />
  )
}
