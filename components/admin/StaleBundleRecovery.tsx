'use client'

import { useEffect } from 'react'
import {
  attemptStaleRecoveryReload,
  clearStaleRecoveryGuard,
  isStaleBundleError,
} from '@/lib/stale-bundle'

/**
 * Catches the errors a stale-after-deploy bundle throws that never reach a React
 * error boundary — a failed dynamic `import()` for a route chunk, a rejected
 * server-action fetch — and reloads once to land on the current deployment.
 * Pairs with AppUpdateNotifier (proactive upgrade) and the `error.tsx`
 * boundaries (which run the same check for errors that *do* bubble through).
 */
export function StaleBundleRecovery() {
  useEffect(() => {
    // We got here, so the app rendered — any prior recovery reload worked.
    clearStaleRecoveryGuard()

    const onError = (e: ErrorEvent) => {
      if (isStaleBundleError(e.error) || isStaleBundleError(e.message)) {
        attemptStaleRecoveryReload()
      }
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isStaleBundleError(e.reason)) {
        attemptStaleRecoveryReload()
      }
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
