import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
}: {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-2"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <ArrowLeft size={12} />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <h1
          className="text-2xl font-bold tracking-tight leading-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1 truncate" style={{ color: 'var(--color-ink-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
