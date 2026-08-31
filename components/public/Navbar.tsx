'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { normalizePhone } from '@/lib/utils'
import { Phone, Copy, Check } from '@phosphor-icons/react'

interface Props {
  businessPhone?: string
  businessInstagram?: string
}

// "+965 6685 7560" for a recognised Kuwait number (the common case — see normalizePhone in
// lib/utils.ts); "+<digits>" for anything else, so a foreign-registered business line still
// renders as something copyable instead of disappearing.
function formatPhoneDisplay(rawPhone: string): string {
  const digits = normalizePhone(rawPhone)
  if (!digits) return ''
  if (digits.startsWith('965') && digits.length === 11) {
    const local = digits.slice(3)
    return `+965 ${local.slice(0, 4)} ${local.slice(4)}`
  }
  return `+${digits}`
}

export function Navbar({ businessPhone, businessInstagram }: Props) {
  const [copied, setCopied] = useState(false)
  const phoneDisplay = businessPhone ? formatPhoneDisplay(businessPhone) : ''
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (revertTimer.current) clearTimeout(revertTimer.current)
  }, [])

  function handleCopyPhone() {
    if (!phoneDisplay) return
    navigator.clipboard
      .writeText(phoneDisplay.replace(/\s/g, ''))
      .then(() => {
        setCopied(true)
        if (revertTimer.current) clearTimeout(revertTimer.current)
        revertTimer.current = setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <header className="site-chrome" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div
        className="flex items-center justify-between gap-4 border-b px-5 py-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            {BRAND_NAME}
          </p>
          {businessInstagram && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {businessInstagram} · Kuwait
            </p>
          )}
        </div>
        <Link
          href="/my-orders"
          className="text-sm font-medium shrink-0"
          style={{ color: 'var(--color-ink-secondary)' }}
        >
          My Orders
        </Link>
      </div>

      {/* Copyable phone strip — the full row is the tap target (min-h-11) so this reads as
          one affordance rather than a decoration next to unrelated text. Distinct from the
          WhatsApp deep-links elsewhere on these pages: this is for dialing/saving the number,
          not messaging. */}
      {phoneDisplay && (
        <button
          type="button"
          onClick={handleCopyPhone}
          className="flex w-full min-h-11 items-center justify-center gap-2 border-b px-4 transition-colors active:scale-[0.99]"
          style={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          aria-label={copied ? 'Phone number copied' : `Copy phone number ${phoneDisplay}`}
        >
          <Phone size={13} weight="bold" style={{ color: 'var(--color-ink-muted)' }} />
          <span
            className="text-xs font-medium"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}
          >
            {phoneDisplay}
          </span>
          {copied ? (
            <span className="flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
              <Check size={13} weight="bold" />
              <span className="text-xs font-medium">Copied</span>
            </span>
          ) : (
            <Copy size={13} style={{ color: 'var(--color-ink-muted)' }} />
          )}
        </button>
      )}
    </header>
  )
}
