import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

const SETTINGS_SECTIONS = [
  { href: '/admin/settings/business', title: 'Business Info', description: 'Phone number, Instagram handle' },
  { href: '/admin/settings/operating-rules', title: 'Operating Rules', description: 'Minimum booking lead time' },
  { href: '/admin/settings/pricing', title: 'Pricing', description: 'Base prices, rush multiplier, minimum' },
  { href: '/admin/settings/blackout-dates', title: 'Blackout Dates', description: 'Blocked date ranges for holidays' },
  { href: '/admin/settings/whatsapp-templates', title: 'WhatsApp Templates', description: 'Message templates for customer notifications' },
  { href: '/admin/settings/options', title: 'Options', description: 'Manage occasions, themes, decoration styles' },
]

export default function SettingsPage() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Settings" subtitle="Configure your ZMade Cakes workspace" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:bg-[color:var(--color-surface-raised)]"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{section.title}</span>
            <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{section.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
