'use client'

import { useRef } from 'react'
import { useScrollRestoration } from '@/lib/hooks/useScrollRestoration'

/** The single scrolling region of the admin shell, sandwiched between the
 *  (non-scrolling) top bar / sidebar and bottom nav. Owns scroll restoration
 *  since app/admin/layout.tsx is an async Server Component and can't use
 *  hooks directly. */
export function AdminScrollRegion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useScrollRestoration(ref)

  return (
    <main
      ref={ref}
      className="admin-main flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      {children}
    </main>
  )
}
