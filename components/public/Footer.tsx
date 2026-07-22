'use client'

import { usePathname } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { whatsappUrlNoText } from '@/lib/whatsapp'

interface Props {
  businessPhone?: string
  businessInstagram?: string
}

export function Footer({ businessPhone, businessInstagram }: Props) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false

  return (
    <footer
      className={`site-chrome flex items-center justify-center gap-2 py-4 px-4 border-t flex-wrap ${isAdmin ? 'hidden md:flex' : ''}`}
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        © {BRAND_NAME} · Kuwait
      </p>
      {businessPhone && (
        <>
          <span className="text-xs" style={{ color: 'var(--color-border-strong)' }}>·</span>
          <a
            href={whatsappUrlNoText(businessPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium"
            style={{ color: 'var(--color-teal)' }}
          >
            Message us on WhatsApp
          </a>
        </>
      )}
      {businessInstagram && (
        <>
          <span className="text-xs" style={{ color: 'var(--color-border-strong)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            {businessInstagram}
          </span>
        </>
      )}
    </footer>
  )
}
