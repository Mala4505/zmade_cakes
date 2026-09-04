'use client'

import { useEffect, useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react'

/**
 * Rendered when the order detail page is reached straight from a create submit
 * (`?created=1`). The submit's own `toast.success` fires the instant the write
 * completes, but this page's own data fetch can still take a few seconds —
 * long enough that the toast is gone before the page appears. This banner lives
 * in the page itself, so it's visible no matter how long that fetch took, and
 * doesn't depend on catching a transient toast at the right moment.
 */
export function CreatedBanner({ created }: { created: boolean }) {
  const [visible, setVisible] = useState(created)

  useEffect(() => {
    if (!created) return
    // Strip the param so a refresh or back/forward doesn't re-show the banner.
    // Deliberately `window.history.replaceState`, not `router.replace` — this page
    // already does a fair amount of data fetching, and a Next router navigation
    // here would re-run all of it just to tidy the URL, plus feed a real
    // (occasionally slow) transition into the shared nav-progress state for
    // something that's purely cosmetic. History API only touches the address bar.
    // Mirrors the same pattern already used by `OrderForm.tsx`'s step wizard.
    window.history.replaceState(null, '', window.location.pathname)
  }, [created])

  if (!visible) return null

  return (
    <div
      className="rounded-xl border p-3.5 mb-4 flex items-center gap-2.5"
      style={{ borderColor: 'var(--color-teal)', backgroundColor: 'var(--color-teal-light)' }}
    >
      <CheckCircle size={18} weight="fill" style={{ color: 'var(--color-teal-deep)' }} />
      <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-teal-deep)' }}>
        Order created
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="text-xs font-medium shrink-0"
        style={{ color: 'var(--color-teal-deep)' }}
      >
        Dismiss
      </button>
    </div>
  )
}
