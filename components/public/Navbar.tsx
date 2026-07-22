import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

interface Props {
  businessInstagram?: string
}

export function Navbar({ businessInstagram }: Props) {
  return (
    <header
      className="site-chrome flex items-center justify-between gap-4 border-b px-5 py-5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div>
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-teal)' }}
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
    </header>
  )
}
