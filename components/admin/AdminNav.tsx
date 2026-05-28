'use client'

import { useState } from 'react'
import Link from 'next/link'
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
} from '@phosphor-icons/react'
import { LogOut, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
import type { User } from '@supabase/supabase-js'
import type React from 'react'

// Accepts both Phosphor icons (size+weight) and Lucide icons (size only)
type AnyIcon = React.ComponentType<{ size?: number; weight?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>

const NAV_ITEMS: { href: string; label: string; Icon: AnyIcon; exact: boolean }[] = [
  { href: '/admin', label: 'Home', Icon: HouseSimple as AnyIcon, exact: true },
  { href: '/admin/inquiries', label: 'Inquiries', Icon: ClipboardText as AnyIcon, exact: false },
  { href: '/admin/orders', label: 'Orders', Icon: Package as AnyIcon, exact: false },
  { href: '/admin/calendar', label: 'Calendar', Icon: CalendarBlank as AnyIcon, exact: false },
  { href: '/admin/analytics', label: 'Analytics', Icon: ChartBar as AnyIcon, exact: false },
  { href: '/admin/customers', label: 'Customers', Icon: Users as AnyIcon, exact: false },
  { href: '/admin/products', label: 'Products', Icon: Layers as AnyIcon, exact: false },
  { href: '/admin/settings', label: 'Settings', Icon: Gear as AnyIcon, exact: false },
]

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

function getBadge(href: string, pendingCount: number, readyCount: number): number {
  if (href === '/admin/inquiries') return pendingCount
  if (href === '/admin/orders') return readyCount
  return 0
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
