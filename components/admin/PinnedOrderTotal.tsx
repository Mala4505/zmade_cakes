'use client'

import { useEffect, useState, type RefObject } from 'react'

interface Props {
  /** The ledger box to watch — the bar appears once this has scrolled above the viewport. */
  anchorRef: RefObject<HTMLElement | null>
  total: number | null
}

/**
 * Keeps the order total visible once the pricing ledger scrolls out of view above —
 * the admin form is long enough on a phone that entering a delivery charge and then
 * scrolling to Payment Status can lose sight of what it did to the total.
 */
export function PinnedOrderTotal({ anchorRef, total }: Props) {
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only pin once the ledger has scrolled above the viewport — not before it's
        // been seen, and not once the page has scrolled past the whole form below it.
        setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [anchorRef])

  if (!pinned || total === null) return null

  return (
    <div className="fixed inset-x-0 z-30 px-4 pointer-events-none" style={{ bottom: 'var(--pinned-total-bottom)' }}>
      <div
        className="mx-auto max-w-lg rounded-t-xl border border-b-0 px-4 py-2.5 flex items-center justify-between pointer-events-auto"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          Order total
        </span>
        <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
          KD {total.toFixed(3)}
        </span>
      </div>
    </div>
  )
}
