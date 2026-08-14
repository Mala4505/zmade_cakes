'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'

/** Mobile-only back affordance for settings sub-pages. The desktop sidebar
 *  is hidden under md, so without this a phone user has no way back to the
 *  settings hub except the browser's back button. Hidden on the index itself. */
export function SettingsMobileBar() {
  const pathname = usePathname()
  if (pathname === '/admin/settings') return null

  return (
    <div
      className="md:hidden sticky top-0 z-10 flex items-center border-b px-2 py-2"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
    >
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium"
        style={{ color: 'var(--color-ink-secondary)' }}
      >
        <ArrowLeft size={16} />
        All settings
      </Link>
    </div>
  )
}
