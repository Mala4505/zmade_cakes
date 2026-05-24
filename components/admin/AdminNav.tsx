'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HouseSimple,
  ClipboardText,
  Package,
  CalendarBlank,
  Gear,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Home', Icon: HouseSimple, exact: true },
  { href: '/admin/inquiries', label: 'Inquiries', Icon: ClipboardText, exact: false },
  { href: '/admin/orders', label: 'Orders', Icon: Package, exact: false },
  { href: '/admin/calendar', label: 'Calendar', Icon: CalendarBlank, exact: false },
  { href: '/admin/settings', label: 'Settings', Icon: Gear, exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function getBadge(href: string, pendingCount: number, readyCount: number): number {
  if (href === '/admin/inquiries') return pendingCount
  if (href === '/admin/orders') return readyCount
  return 0
}

export function AdminSidebar({
  pendingCount,
  readyCount,
}: {
  pendingCount: number
  readyCount: number
}) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-60 h-svh sticky top-0 shrink-0 border-r"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center h-14 px-5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          ZMade Cakes
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const active = isActive(pathname, href, exact)
          const badge = getBadge(href, pendingCount, readyCount)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-[color:var(--color-teal)]'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink-secondary)]'
              )}
              style={active ? { backgroundColor: 'var(--color-teal-light)' } : undefined}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{label}</span>
              {badge > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                  style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function AdminBottomNav({
  pendingCount,
  readyCount,
}: {
  pendingCount: number
  readyCount: number
}) {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderColor: 'var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
        const active = isActive(pathname, href, exact)
        const badge = getBadge(href, pendingCount, readyCount)
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px]"
            style={{ color: active ? 'var(--color-teal)' : 'var(--color-ink-muted)' }}
          >
            <div className="relative">
              <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              {badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5"
                  style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
