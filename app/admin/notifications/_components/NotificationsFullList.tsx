'use client'

import { PageHeader } from '@/components/admin/PageHeader'
import { NotificationList } from '@/components/admin/NotificationList'
import { useNotifications } from '@/components/admin/NotificationContext'

/** Full notifications list (up to the 50 seeded by app/admin/layout.tsx). Reads from the
 *  shared NotificationProvider context — no separate Supabase query here, so this stays
 *  in sync with the bell dropdowns and cross-tab realtime updates for free. */
export function NotificationsFullList() {
  const { notifications, unreadCount, markAllRead } = useNotifications()

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-teal)' }}
            >
              Mark all read
            </button>
          ) : undefined
        }
      />
      <div
        className="rounded-xl border px-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <NotificationList notifications={notifications} />
      </div>
    </>
  )
}
