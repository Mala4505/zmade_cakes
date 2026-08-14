'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type AdminHeaderIcon = React.ComponentType<{
  size?: number
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}>

export interface AdminHeaderMenuItem {
  key: string
  label: string
  icon: AdminHeaderIcon
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  /** Renders `icon` with `animate-spin` — for an in-flight action's own icon slot. */
  spinning?: boolean
}

export interface AdminHeaderOverride {
  title: string
  backHref: string
  menuItems?: AdminHeaderMenuItem[]
}

const AdminHeaderContext = createContext<{
  override: AdminHeaderOverride | null
  setOverride: (o: AdminHeaderOverride | null) => void
} | null>(null)

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<AdminHeaderOverride | null>(null)
  const value = useMemo(() => ({ override, setOverride }), [override])
  return <AdminHeaderContext.Provider value={value}>{children}</AdminHeaderContext.Provider>
}

function useAdminHeaderContext() {
  const ctx = useContext(AdminHeaderContext)
  if (!ctx) throw new Error('useAdminHeaderContext must be used within AdminHeaderProvider')
  return ctx
}

/**
 * Lets a detail page (order, inquiry, customer, ...) replace the mobile
 * sticky header's default section title with a back-link + contextual title,
 * and add page-specific actions to its overflow menu. Reverts to the default
 * on unmount, so navigating away always restores the section title.
 */
export function useAdminHeader(override: AdminHeaderOverride) {
  const { setOverride } = useAdminHeaderContext()

  useEffect(() => {
    setOverride(override)
    return () => setOverride(null)
    // Re-register on meaningful field changes only (e.g. a menu item's
    // disabled/spinning state), not on every render of the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override.title, override.backHref, override.menuItems])
}

export function useAdminHeaderOverride() {
  return useAdminHeaderContext().override
}
