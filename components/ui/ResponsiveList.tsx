import type { ReactNode } from 'react'

/**
 * Toggles between a desktop table and a mobile card list at the `md`
 * breakpoint. Both slots always render server-side — this is a CSS-only
 * `hidden`/`block` swap, not a remount — so it's safe to use around a
 * `<table>` and a card list that share the same underlying data.
 *
 * This component owns only the responsive toggle shape, not the column/card
 * markup itself: `/admin/inquiries` and `/admin/customers` render different
 * columns, so each page composes its own `desktop`/`mobile` content.
 */
export function ResponsiveList({
  desktop,
  mobile,
  className,
}: {
  desktop: ReactNode
  mobile: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="hidden md:block">{desktop}</div>
      <div className="block md:hidden">{mobile}</div>
    </div>
  )
}
