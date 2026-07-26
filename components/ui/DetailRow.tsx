export interface DetailRowProps {
  label: string
  value: string
  /** Use Geist Mono for the value — money, dates, phone numbers. */
  mono?: boolean
  /** Text direction override, for RTL/mixed-direction free text. */
  dir?: React.HTMLAttributes<HTMLElement>['dir']
  /** Give money rows (Total, Balance Due) more visual weight than metadata rows. */
  emphasize?: boolean
  /**
   * 'inline' (default) puts the label left and value right on one line.
   * 'stacked' puts the label above the value, wraps long free text, and
   * defaults dir to 'auto'.
   */
  layout?: 'inline' | 'stacked'
}

export function DetailRow({ label, value, mono, dir, emphasize, layout = 'inline' }: DetailRowProps) {
  if (layout === 'stacked') {
    return (
      <div>
        <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
        <p
          className="text-sm mt-0.5 whitespace-pre-wrap"
          style={{ color: 'var(--color-ink-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}
          dir={dir ?? 'auto'}
        >
          {value}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs pt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span
        dir={dir}
        className={emphasize ? 'text-base font-bold text-right' : 'text-sm text-right'}
        style={{
          color: emphasize ? 'var(--color-ink)' : 'var(--color-ink-secondary)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}
