import Link from 'next/link'

/**
 * Table / Board segmented control for the merged Orders section. Table is the
 * default view (bare `/admin/orders`, no `view` param); Board is `?view=board`.
 * These two views own separate, non-overlapping search-param namespaces (the
 * table's `status/payment/sort/dir/q/page` vs. the board's own `cancelled`), so
 * switching views intentionally does not carry the other view's params along —
 * each view lands on its own default state.
 */
export default function ViewToggle({ view }: { view: 'table' | 'board' }) {
  const itemStyle = (active: boolean): React.CSSProperties =>
    active
      ? { backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }
      : { color: 'var(--color-ink-muted)' }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <Link
        href="/admin/orders"
        className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={itemStyle(view === 'table')}
      >
        Table
      </Link>
      <Link
        href="/admin/orders?view=board"
        className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={itemStyle(view === 'board')}
      >
        Board
      </Link>
    </div>
  )
}
