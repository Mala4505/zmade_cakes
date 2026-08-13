import Link from 'next/link'
import { CaretRight, SlidersHorizontal } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import { SETTINGS_SECTIONS } from './_components/sections'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <>
      {/* Mobile: the card grid is the settings hub (sidebar is hidden < md) */}
      <div className="md:hidden px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-ink-muted)' }}>
          Configure your ZMade Cakes workspace
        </p>

        <div className="flex flex-col gap-2">
          {SETTINGS_SECTIONS.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border p-4 transition-colors active:bg-[color:var(--color-surface-raised)]"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal)' }}
              >
                <Icon size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
                <span className="block text-xs truncate" style={{ color: 'var(--color-ink-muted)' }}>{description}</span>
              </span>
              <CaretRight size={16} style={{ color: 'var(--color-ink-muted)' }} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: sidebar already lists sections, so the index is a quiet prompt */}
      <div className="hidden md:flex flex-col items-center justify-center h-svh gap-3 text-center px-6" style={{ color: 'var(--color-ink-muted)' }}>
        <SlidersHorizontal size={40} weight="thin" />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
            Choose a settings section
          </p>
          <p className="text-xs mt-1">Pick one from the list on the left to start editing.</p>
        </div>
      </div>
    </>
  )
}
