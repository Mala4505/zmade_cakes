'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui'

export default function AdminError({
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
    <div className="flex min-h-[60svh] items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        description={
          error.digest
            ? `This page hit an unexpected error (ref ${error.digest}). Trying again usually fixes it.`
            : 'This page hit an unexpected error. Trying again usually fixes it.'
        }
        onRetry={() => (unstable_retry ?? reset)()}
      />
    </div>
  )
}
