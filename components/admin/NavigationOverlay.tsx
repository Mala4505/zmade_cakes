'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useNavPending } from './NavPendingContext'

/** Full-page cover shown while a sidebar/bottom-nav navigation is in flight.
 *  Delayed by 150ms so fast/prefetched navigations don't flash it. */
export function NavigationOverlay() {
  const { isPending } = useNavPending()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isPending) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(true), 150)
    return () => clearTimeout(timer)
  }, [isPending])

  if (!show) return null

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-cream) 70%, transparent)' }}
      aria-hidden="true"
    >
      <span style={{ color: 'var(--color-teal)' }}>
        <Spinner size={28} />
      </span>
    </div>
  )
}
