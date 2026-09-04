'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavPending } from './NavPendingContext'

/** Slim top-of-content progress bar shown while a client navigation is in
 *  flight — sidebar/bottom-nav `<Link>`s *and* post-mutation `router.push` /
 *  `router.refresh` from forms (see `useAsyncAction`). Delayed 150ms so fast or
 *  prefetched navigations never flash it; fades out once the route settles. */
// However a navigation manages to wedge — a Next router transition that never
// settles, a destination that suspends forever — the bar giving up after this
// long beats staying lit indefinitely. It reflects "still loading" up to this
// point; past it, it just means the tracked pending state didn't clear, and
// that's not something the user needs sweeping left-to-right at them forever.
const MAX_ACTIVE_MS = 12000

export function NavigationOverlay() {
  const { isPending } = useNavPending()
  const [state, setState] = useState<'hidden' | 'active' | 'leaving'>('hidden')
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)

    if (isPending) {
      enterTimer.current = setTimeout(() => {
        setState('active')
        maxTimer.current = setTimeout(() => setState('hidden'), MAX_ACTIVE_MS)
      }, 150)
      return
    }

    if (maxTimer.current) clearTimeout(maxTimer.current)
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
      if (maxTimer.current) clearTimeout(maxTimer.current)
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
