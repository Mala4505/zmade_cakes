'use client'

import { WhatsappLogo } from '@phosphor-icons/react'
import { whatsappUrl, whatsappUrlNoText } from '@/lib/whatsapp'

type WhatsAppKind = 'confirmation' | 'balance-due' | 'order-ready' | 'plain'

interface ResolvedWhatsAppAction {
  label: string
  text: string
  linkUrl?: string
  kind: WhatsAppKind
}

// Color language matches what each kind of WhatsApp action already used across the
// admin surfaces before this consolidation: teal for confirmation, WhatsApp-green
// for "order ready", a darker green for "balance due", and a neutral outline for
// the freeform fallback.
const PILL_STYLES: Record<WhatsAppKind, { bg?: string; fg: string; border?: string }> = {
  confirmation: { bg: 'var(--color-teal)', fg: 'var(--color-cream)' },
  'order-ready': { bg: '#25D366', fg: '#fff' },
  'balance-due': { bg: '#1a9e4c', fg: '#fff' },
  plain: {
    border: 'var(--color-border)',
    bg: 'var(--color-surface-raised)',
    fg: 'var(--color-ink-secondary)',
  },
}

// Icon-only variant reuses the same hue per kind, applied to the glyph itself
// rather than a filled background.
const ICON_COLORS: Record<WhatsAppKind, string> = {
  confirmation: 'var(--color-teal)',
  'order-ready': '#25D366',
  'balance-due': '#1a9e4c',
  plain: 'var(--color-ink-muted)',
}

export default function WhatsAppButton({
  variant,
  action,
  customer_phone,
}: {
  variant: 'icon' | 'pill'
  action: ResolvedWhatsAppAction
  customer_phone: string
}) {
  const href =
    action.kind === 'plain'
      ? whatsappUrlNoText(customer_phone)
      : whatsappUrl(customer_phone, action.text)

  if (variant === 'icon') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={action.label}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center w-7 h-7 transition-all active:scale-[0.9] hover:opacity-70"
        style={{ color: ICON_COLORS[action.kind] }}
      >
        <WhatsappLogo size={20} weight="fill" />
      </a>
    )
  }

  const style = PILL_STYLES[action.kind]

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        border: style.border ? `1px solid ${style.border}` : undefined,
      }}
    >
      <WhatsappLogo size={15} weight="fill" />
      {action.label}
    </a>
  )
}
