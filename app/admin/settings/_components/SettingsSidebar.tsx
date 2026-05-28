'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Buildings,
  Clock,
  CurrencyDollar,
  CalendarX,
  WhatsappLogo,
  ToggleRight,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/settings/business', label: 'Business Info', Icon: Buildings },
  { href: '/admin/settings/operating-rules', label: 'Operating Rules', Icon: Clock },
  { href: '/admin/settings/pricing', label: 'Pricing', Icon: CurrencyDollar },
  { href: '/admin/settings/blackout-dates', label: 'Blackout Dates', Icon: CalendarX },
  { href: '/admin/settings/whatsapp-templates', label: 'WhatsApp Templates', Icon: WhatsappLogo },
  { href: '/admin/settings/options', label: 'Options', Icon: ToggleRight },
] as const

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-52 shrink-0 border-r h-svh sticky top-0"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="px-3 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Settings
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
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
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
