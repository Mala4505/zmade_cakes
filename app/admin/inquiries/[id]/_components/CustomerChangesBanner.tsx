import { PencilSimple, ChatCircleText } from '@phosphor-icons/react/dist/ssr'
import type { CustomerEditDiffEntry } from '@/lib/format'

interface Props {
  diff: CustomerEditDiffEntry[] | null
  comments: string
}

export default function CustomerChangesBanner({ diff, comments }: Props) {
  const hasDiff = !!diff && diff.length > 0
  const hasComments = comments.trim() !== ''

  if (!hasDiff && !hasComments) return null

  return (
    <div
      className="rounded-xl border p-4 mb-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}
    >
      {hasDiff && (
        <div>
          <p
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-warning)' }}
          >
            <PencilSimple size={14} weight="bold" />
            Customer Changed Before Confirming
          </p>
          <div className="flex flex-col gap-1.5">
            {diff!.map((entry) => (
              <div key={entry.field} className="text-sm leading-snug">
                <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{entry.label}: </span>
                <span style={{ color: 'var(--color-ink-muted)', textDecoration: 'line-through' }}>
                  {entry.before}
                </span>
                <span style={{ color: 'var(--color-ink-muted)' }}> → </span>
                <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{entry.after}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasComments && (
        <div className={hasDiff ? 'pt-3 border-t' : ''} style={{ borderColor: 'var(--color-warning)' }}>
          <p
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--color-warning)' }}
          >
            <ChatCircleText size={14} weight="bold" />
            Message From Customer
          </p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{comments}</p>
        </div>
      )}
    </div>
  )
}
