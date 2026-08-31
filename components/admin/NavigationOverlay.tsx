'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavPending } from './NavPendingContext'

/** Slim top-of-content progress bar shown while a client navigation is in
 *  flight — sidebar/bottom-nav `<Link>`s *and* post-mutation `router.push` /
 *  `router.refresh` from forms (see `useAsyncAction`). Delayed 150ms so fast or
 *  prefetched navigations never flash it; fades out once the route settles. */
export function NavigationOverlay() {
  const { isPending } = useNavPending()
  const [state, setState] = useState<'hidden' | 'active' | 'leaving'>('hidden')
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)

    if (isPending) {
      enterTimer.current = setTimeout(() => setState('active'), 150)
      return
    }

    setState((s) => {
      if (s !== 'active') return 'hidden'
      leaveTimer.current = setTimeout(() => setState('hidden'), 240)
      return 'leaving'
    })
  }, [isPending])

  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    },
    []
  )

  if (state === 'hidden') return null

  return (
    <div
      className="absolute top-0 left-0 right-0 h-0.5 z-30 overflow-hidden pointer-events-none"
      style={{
        opacity: state === 'leaving' ? 0 : 1,
        transition: 'opacity 200ms var(--ease-out-quart)',
      }}
      aria-hidden="true"
    >
      <div
        className="zmade-nav-progress-bar h-full w-1/4"
        style={{ backgroundColor: 'var(--color-teal)' }}
      />
    </div>
  )
}
