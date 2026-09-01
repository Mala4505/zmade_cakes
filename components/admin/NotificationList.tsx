'use client'

import Link from 'next/link'
import { ClipboardText, CheckCircle, Package, Bell } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui'
import type { Notification, NotificationType } from '@/lib/supabase/types'

// Phosphor icons type `weight` as a literal union (IconWeight), which is narrower than the
// plain `string` used here — cast through this shared shape, same pattern as AdminNav's AnyIcon.
type AnyIcon = React.ComponentType<{ size?: number; weight?: string }>

const TYPE_ICON: Record<NotificationType, AnyIcon> = {
  inquiry_created: ClipboardText as AnyIcon,
  customer_confirmed: CheckCircle as AnyIcon,
  order_update: Package as AnyIcon,
  general: Bell as AnyIcon,
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function targetHref(n: Notification): string | null {
  if (n.order_id) return `/admin/orders/${n.order_id}`
  if (n.inquiry_id) return `/admin/orders/${n.inquiry_id}`
  return null
}

export function NotificationList({
  notifications,
  onItemClick,
}: {
  notifications: Notification[]
  onItemClick?: (n: Notification) => void
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell size={20} />}
        title="No notifications yet"
        description="New inquiries and order updates will show up here."
      />
    )
  }

  return (
    <div className="flex flex-col">
      {notifications.map((n) => {
        const Icon = TYPE_ICON[n.type] ?? Bell
        const href = targetHref(n)
        const row = (
          <div className="flex items-start gap-3 py-3 px-1 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal)' }}
            >
              <Icon size={14} weight="fill" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                {n.title}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
                {n.body}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <time
                className="text-[11px]"
                style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {relativeTime(n.created_at)}
              </time>
              {!n.is_read && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-teal)' }}
                />
              )}
            </div>
          </div>
        )

        return href ? (
          <Link key={n.id} href={href} onClick={() => onItemClick?.(n)} className="block hover:bg-[var(--color-surface-raised)] rounded-lg transition-colors">
            {row}
          </Link>
        ) : (
          <div key={n.id} onClick={() => onItemClick?.(n)} className="cursor-default">
            {row}
          </div>
        )
      })}
    </div>
  )
}
