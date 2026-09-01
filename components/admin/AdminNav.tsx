'use client'

import { useEffect, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  HouseSimple,
  Package,
  CalendarBlank,
  ChartBar,
  Gear,
  Users,
  DotsThreeOutline,
  ArrowLeft,
} from '@phosphor-icons/react'
import { LogOut, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import { useNavPending } from './NavPendingContext'
import { useAdminHeaderOverride } from './AdminHeaderContext'
import { NotificationBellMobile } from './NotificationBellMobile'
import { NotificationBellDesktop } from './NotificationBellDesktop'
import { Modal } from '@/components/ui/Modal'
import type { User } from '@supabase/supabase-js'
import type React from 'react'

// Accepts both Phosphor icons (size+weight) and Lucide icons (size only)
type AnyIcon = React.ComponentType<{ size?: number; weight?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>

const NAV_ITEMS: { href: string; label: string; Icon: AnyIcon; exact: boolean }[] = [
  { href: '/admin/calendar', label: 'Calendar', Icon: CalendarBlank as AnyIcon, exact: false },
  { href: '/admin', label: 'Dashboard', Icon: HouseSimple as AnyIcon, exact: true },
  { href: '/admin/orders', label: 'Orders', Icon: Package as AnyIcon, exact: false },
  { href: '/admin/analytics', label: 'Analytics', Icon: ChartBar as AnyIcon, exact: false },
  { href: '/admin/customers', label: 'Customers', Icon: Users as AnyIcon, exact: false },
  { href: '/admin/products', label: 'Products', Icon: Layers as AnyIcon, exact: false },
  { href: '/admin/settings', label: 'Settings', Icon: Gear as AnyIcon, exact: false },
]

// Bottom nav only has room for a handful of tabs before it gets cramped —
// these are the ones used day-to-day; the rest live behind "More".
const MOBILE_PRIMARY_HREFS = ['/admin', '/admin/orders', '/admin/calendar']

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

function getBadge(href: string, pendingCount: number, activeOrdersCount: number): number {
  if (href === '/admin/orders') return pendingCount + activeOrdersCount
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
        aria-label="Sign out"
        className="min-h-11 min-w-11 -m-2 flex items-center justify-center rounded-md transition-colors"
        style={{
          backgroundColor: hovered ? 'var(--color-danger-light)' : 'transparent',
          color: hovered ? 'var(--color-danger)' : 'var(--color-forest-ink-muted)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <LogOut size={14} />
      </button>
    </form>
  )
}

/**
 * Desktop-only, full-width top bar. Replaces cramming the wordmark and the
 * notification bell into the sidebar's own 240px-wide header row — that row
 * was ~30-40px too narrow to hold both without overflowing its edge. This
 * gives both room, and the sidebar goes back to being nav-only.
 */
export function AdminTopBar() {
  return (
    <header
      className="hidden lg:flex items-center gap-2.5 h-14 px-6 border-b shrink-0"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderColor: 'var(--color-border)',
      }}
    >
      <Image src="/logo.svg" alt="" width={32} height={32} style={{ width: 32, height: 32, flexShrink: 0 }} priority />
      <span
        className="text-lg font-semibold tracking-tight"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
      >
        ZMade Cakes
      </span>
      <span className="flex-1" />
      <NotificationBellDesktop />
    </header>
  )
}

export function AdminSidebar({
  pendingCount,
  activeOrdersCount,
  user,
}: {
  pendingCount: number
  activeOrdersCount: number
  user: User | null
}) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0"
      style={{ backgroundColor: 'var(--color-forest)' }}
    >
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const active = isActive(pathname, href, exact)
          const badge = getBadge(href, pendingCount, activeOrdersCount)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-[color:var(--color-forest-ink)]'
                  : 'text-[color:var(--color-forest-ink-muted)] hover:text-[color:var(--color-forest-ink)]'
              )}
              style={active ? { backgroundColor: 'var(--color-forest-active)' } : undefined}
            >
              <NavLinkStatus Icon={Icon} active={active} size={18} href={href} />
              <span>{label}</span>
              {badge > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                  style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-forest)' }}
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
        style={{ borderColor: 'var(--color-forest-border)' }}
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-forest)' }}
          >
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span
            className="flex-1 text-xs font-medium truncate min-w-0"
            style={{ color: 'var(--color-forest-ink-muted)' }}
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
  activeOrdersCount,
}: {
  pendingCount: number
  activeOrdersCount: number
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryItems = NAV_ITEMS.filter(({ href }) => MOBILE_PRIMARY_HREFS.includes(href))
  const moreItems = NAV_ITEMS.filter(({ href }) => !MOBILE_PRIMARY_HREFS.includes(href))
  const moreActive = moreItems.some(({ href, exact }) => isActive(pathname, href, exact))
  const moreBadge = moreItems.reduce((sum, { href }) => sum + getBadge(href, pendingCount, activeOrdersCount), 0)

  return (
    <>
      <nav
        className="lg:hidden shrink-0 flex border-t"
        style={{
          backgroundColor: 'var(--color-cream)',
          borderColor: 'var(--color-border)',
          // A little cushion beyond the raw inset: env(safe-area-inset-bottom)
          // reports 0 on Android and outside an installed PWA, so without an
          // always-on minimum the tab labels sit flush against the literal
          // bottom edge of the screen on those devices.
          paddingBottom: 'calc(var(--safe-b) + 8px)',
        }}
      >
        {primaryItems.map(({ href, label, Icon, exact }) => (
          <BottomNavTab
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={isActive(pathname, href, exact)}
            badge={getBadge(href, pendingCount, activeOrdersCount)}
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
            const badge = getBadge(href, pendingCount, activeOrdersCount)
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
  const override = useAdminHeaderOverride()
  const [moreOpen, setMoreOpen] = useState(false)

  // Page-specific actions (e.g. Print, Cancel Order) get a beat to let the
  // modal's own exit animation finish before firing — Modal portals to
  // document.body outside the page's `.no-print` wrapper, so an action like
  // window.print() invoked in the same tick as closing risks catching the
  // modal mid-close in the print snapshot.
  const runMenuAction = (fn: () => void) => {
    setMoreOpen(false)
    setTimeout(fn, 200)
  }

  return (
    <>
      <header
        className="lg:hidden flex items-center gap-2.5 h-14 px-4 border-b shrink-0 z-30"
        style={{
          backgroundColor: 'var(--color-cream)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 0 var(--color-border)',
        }}
      >
        {override ? (
          <>
            <Link
              href={override.backHref}
              aria-label="Back"
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg shrink-0"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              <ArrowLeft size={20} weight="bold" aria-hidden="true" />
            </Link>
            <span
              className="text-base font-semibold tracking-tight truncate min-w-0"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {override.title}
            </span>
          </>
        ) : (
          <>
            <Image src="/logo.svg" alt="" width={28} height={28} style={{ width: 28, height: 28, flexShrink: 0 }} priority />
            <span
              className="text-base font-semibold tracking-tight truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {current?.label ?? 'ZMade Cakes'}
            </span>
          </>
        )}
        <span className="flex-1 min-w-0" />
        <NotificationBellMobile />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More actions"
          className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <DotsThreeOutline size={20} aria-hidden="true" />
        </button>
      </header>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More actions" size="sm">
        <div className="flex flex-col gap-1 -mx-1">
          {override?.menuItems && override.menuItems.length > 0 && (
            <>
              {override.menuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => runMenuAction(item.onClick)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                  style={{ color: item.danger ? 'var(--color-danger)' : 'var(--color-ink-secondary)' }}
                >
                  <item.icon size={18} aria-hidden="true" className={item.spinning ? 'animate-spin' : undefined} />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
            </>
          )}
          <Link
            href="/admin/settings"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-[color:var(--color-ink-secondary)] hover:bg-[var(--color-surface-raised)]"
          >
            <Gear size={18} aria-hidden="true" />
            <span>Settings</span>
          </Link>
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
