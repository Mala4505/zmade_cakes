'use client'

import { useEffect, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  HouseSimple,
  ClipboardText,
  Package,
  CalendarBlank,
  ChartBar,
  Gear,
  Users,
  DotsThreeOutline,
} from '@phosphor-icons/react'
import { LogOut, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { useNavPending } from './NavPendingContext'
import { NotificationBellMobile } from './NotificationBellMobile'
import { Modal } from '@/components/ui/Modal'
import type { User } from '@supabase/supabase-js'
import type React from 'react'

// Accepts both Phosphor icons (size+weight) and Lucide icons (size only)
type AnyIcon = React.ComponentType<{ size?: number; weight?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>

const NAV_ITEMS: { href: string; label: string; Icon: AnyIcon; exact: boolean }[] = [
  { href: '/admin/calendar', label: 'Calendar', Icon: CalendarBlank as AnyIcon, exact: false },
  { href: '/admin', label: 'Dashboard', Icon: HouseSimple as AnyIcon, exact: true },
  { href: '/admin/inquiries', label: 'Inquiries', Icon: ClipboardText as AnyIcon, exact: false },
  { href: '/admin/orders', label: 'Orders', Icon: Package as AnyIcon, exact: false },
  { href: '/admin/analytics', label: 'Analytics', Icon: ChartBar as AnyIcon, exact: false },
  { href: '/admin/customers', label: 'Customers', Icon: Users as AnyIcon, exact: false },
  { href: '/admin/products', label: 'Products', Icon: Layers as AnyIcon, exact: false },
  { href: '/admin/settings', label: 'Settings', Icon: Gear as AnyIcon, exact: false },
]

// Bottom nav only has room for a handful of tabs before it gets cramped —
// these are the ones used day-to-day; the rest live behind "More".
const MOBILE_PRIMARY_HREFS = ['/admin', '/admin/orders', '/admin/inquiries', '/admin/calendar']

/** Longest-prefix match so nested routes (e.g. /admin/orders/12) resolve to the right label. */
function currentNavItem(pathname: string) {
  return (
    NAV_ITEMS.filter(({ href, exact }) => isActive(pathname, href, exact)).sort(
      (a, b) => b.href.length - a.href.length
    )[0] ?? null
  )
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function getBadge(href: string, pendingCount: number, readyCount: number): number {
  if (href === '/admin/inquiries') return pendingCount
  if (href === '/admin/orders') return readyCount
  return 0
}

/**
 * Rendered as a child of <Link> so useLinkStatus can read that link's
 * in-flight navigation (the hook only works in a descendant of Link).
 * Reports pending state up to NavPendingContext, which drives a single
 * full-page NavigationOverlay instead of an inline per-icon spinner.
 */
function NavLinkStatus({ Icon, active, size, href }: { Icon: AnyIcon; active: boolean; size: number; href: string }) {
  const { pending } = useLinkStatus()
  const { setLinkPending } = useNavPending()

  useEffect(() => {
    setLinkPending(href, pending)
    return () => setLinkPending(href, false)
  }, [pending, href, setLinkPending])

  return <Icon size={size} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
}

function LogoutButton() {
  const [hovered, setHovered] = useState(false)
  return (
    <form action={signOut}>
      <button
        type="submit"
        title="Sign out"
        className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
        style={{
          backgroundColor: hovered ? 'var(--color-danger-light)' : 'transparent',
          color: hovered ? 'var(--color-danger)' : 'var(--color-ink-muted)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <LogOut size={14} />
      </button>
    </form>
  )
}

export function AdminSidebar({
  pendingCount,
  readyCount,
  user,
}: {
  pendingCount: number
  readyCount: number
  user: User | null
}) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-60 h-svh sticky top-0 shrink-0 border-r drop-shadow-sm"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center gap-2.5 h-14 px-5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Image src="/logo.svg" alt="" width={36} height={36} style={{ width: 36, height: 36, flexShrink: 0 }} priority />
        <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--color-ink)' }}>
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
              <NavLinkStatus Icon={Icon} active={active} size={18} href={href} />
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

      <div
        className="mt-auto pt-3 border-t px-3 pb-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-teal)' }}
          >
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span
            className="flex-1 text-xs font-medium truncate min-w-0"
            style={{ color: 'var(--color-ink-secondary)' }}
          >
            {user?.email ?? 'Admin'}
          </span>
          <LogoutButton />
        </div>
      </div>
    </aside>
  )
}

function BottomNavTab({
  href,
  label,
  Icon,
  active,
  badge,
  onClick,
}: {
  href?: string
  label: string
  Icon: AnyIcon
  active: boolean
  badge?: number
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="relative">
        {href ? (
          <NavLinkStatus Icon={Icon} active={active} size={22} href={href} />
        ) : (
          <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
        )}
        {!!badge && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </>
  )
  const className = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px]'
  const style = { color: active ? 'var(--color-teal)' : 'var(--color-ink-muted)' }

  if (href) {
    return (
      <Link key={href} href={href} className={className} style={style}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
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
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryItems = NAV_ITEMS.filter(({ href }) => MOBILE_PRIMARY_HREFS.includes(href))
  const moreItems = NAV_ITEMS.filter(({ href }) => !MOBILE_PRIMARY_HREFS.includes(href))
  const moreActive = moreItems.some(({ href, exact }) => isActive(pathname, href, exact))
  const moreBadge = moreItems.reduce((sum, { href }) => sum + getBadge(href, pendingCount, readyCount), 0)

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t"
        style={{
          backgroundColor: 'var(--color-cream)',
          borderColor: 'var(--color-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {primaryItems.map(({ href, label, Icon, exact }) => (
          <BottomNavTab
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={isActive(pathname, href, exact)}
            badge={getBadge(href, pendingCount, readyCount)}
          />
        ))}
        <BottomNavTab
          label="More"
          Icon={DotsThreeOutline as AnyIcon}
          active={moreActive}
          badge={moreBadge}
          onClick={() => setMoreOpen(true)}
        />
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <div className="flex flex-col gap-1 -mx-1">
          {moreItems.map(({ href, label, Icon, exact }) => {
            const active = isActive(pathname, href, exact)
            const badge = getBadge(href, pendingCount, readyCount)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-[color:var(--color-teal)]'
                    : 'text-[color:var(--color-ink-secondary)] hover:bg-[var(--color-surface-raised)]'
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
          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  )
}

/**
 * Mobile-only top bar. Shows the current section instead of just repeating
 * the logo that's already in the bottom nav — otherwise the bar is 56px of
 * dead space on every page.
 */
export function AdminMobileTopBar() {
  const pathname = usePathname()
  const current = currentNavItem(pathname)

  return (
    <header
      className="md:hidden flex items-center gap-2.5 h-14 px-4 border-b shrink-0 sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 0 var(--color-border)',
      }}
    >
      <Image src="/logo.svg" alt="" width={28} height={28} style={{ width: 28, height: 28, flexShrink: 0 }} priority />
      <span
        className="text-base font-semibold tracking-tight truncate"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
      >
        {current?.label ?? 'ZMade Cakes'}
      </span>
      <NotificationBellMobile />
    </header>
  )
}
