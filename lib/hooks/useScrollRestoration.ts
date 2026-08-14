'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { usePathname } from 'next/navigation'

// Module-level, not per-component state: needs to survive navigating away
// and back. Cleared on a hard reload, which is fine — the list remounts
// under fresh server data anyway.
const positions = new Map<string, number>()

export function useScrollRestoration(ref: RefObject<HTMLElement | null>) {
  const pathname = usePathname()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Capture the path this effect instance belongs to so the scroll
    // listener always writes under the correct key, even if `pathname`
    // changes again before this effect's cleanup runs.
    const path = pathname
    el.scrollTop = positions.get(path) ?? 0

    const onScroll = () => positions.set(path, el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      positions.set(path, el.scrollTop)
      el.removeEventListener('scroll', onScroll)
    }
  }, [pathname, ref])
}
