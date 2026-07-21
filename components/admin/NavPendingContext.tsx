'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** Tracks which sidebar/bottom-nav links currently have a pending client-side
 *  navigation, so a single full-page overlay can reflect "some nav is in flight"
 *  without each NavLinkStatus rendering its own inline spinner. */
const NavPendingContext = createContext<{
  isPending: boolean
  setLinkPending: (href: string, pending: boolean) => void
} | null>(null)

export function NavPendingProvider({ children }: { children: React.ReactNode }) {
  const [pendingHrefs, setPendingHrefs] = useState<Set<string>>(new Set())

  const setLinkPending = useCallback((href: string, pending: boolean) => {
    setPendingHrefs((prev) => {
      if (prev.has(href) === pending) return prev
      const next = new Set(prev)
      if (pending) next.add(href)
      else next.delete(href)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ isPending: pendingHrefs.size > 0, setLinkPending }),
    [pendingHrefs, setLinkPending]
  )

  return <NavPendingContext.Provider value={value}>{children}</NavPendingContext.Provider>
}

export function useNavPending() {
  const ctx = useContext(NavPendingContext)
  if (!ctx) throw new Error('useNavPending must be used within NavPendingProvider')
  return ctx
}
