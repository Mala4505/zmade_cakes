'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/** Tracks in-flight client navigations — both sidebar/bottom-nav `<Link>`s
 *  (keyed by href) and programmatic `router.push`/`router.refresh` calls from
 *  forms (keyed by an opaque action id) — so a single top-of-viewport progress
 *  bar can reflect "some navigation is in flight" without each call site
 *  rendering its own inline spinner. */
const NavPendingContext = createContext<{
  isPending: boolean
  setLinkPending: (href: string, pending: boolean) => void
  /** Report a form/action-driven navigation (post-mutation `router.push` etc.). */
  setActionPending: (id: string, pending: boolean) => void
} | null>(null)

export function NavPendingProvider({ children }: { children: React.ReactNode }) {
  const [pendingHrefs, setPendingHrefs] = useState<Set<string>>(new Set())
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())

  const makeSetter =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (key: string, pending: boolean) => {
      setter((prev) => {
        if (prev.has(key) === pending) return prev
        const next = new Set(prev)
        if (pending) next.add(key)
        else next.delete(key)
        return next
      })
    }

  const setLinkPending = useCallback(makeSetter(setPendingHrefs), [])
  const setActionPending = useCallback(makeSetter(setPendingActions), [])

  const value = useMemo(
    () => ({
      isPending: pendingHrefs.size > 0 || pendingActions.size > 0,
      setLinkPending,
      setActionPending,
    }),
    [pendingHrefs, pendingActions, setLinkPending, setActionPending]
  )

  return <NavPendingContext.Provider value={value}>{children}</NavPendingContext.Provider>
}

export function useNavPending() {
  const ctx = useContext(NavPendingContext)
  if (!ctx) throw new Error('useNavPending must be used within NavPendingProvider')
  return ctx
}

/** Like `useNavPending`, but returns `null` outside the admin shell instead of
 *  throwing — for shared hooks (`useAsyncAction`) that also run on customer
 *  routes, where there is no progress bar to feed. */
export function useOptionalNavPending() {
  return useContext(NavPendingContext)
}
