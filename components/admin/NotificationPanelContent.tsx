'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRinging } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useNotifications } from './NotificationContext'
import { NotificationList } from './NotificationList'
import { getLocalPushStatus, subscribeToPush } from '@/lib/push-client'
import { savePushSubscription } from '@/lib/actions/push'

// Compact dropdown vs. full page — cap what a bell panel renders at once.
const MAX_PANEL_ITEMS = 10

/**
 * Shared body for both bell surfaces (desktop anchored dropdown, mobile Modal):
 * header + unread action, capped notification list, "View all" link, and the
 * push opt-in row. `onNavigate` is called on any link click / mark-all so the
 * host (dropdown or modal) can close itself.
 */
export function NotificationPanelContent({ onNavigate }: { onNavigate?: () => void }) {
  const { notifications, unreadCount, markAllRead } = useNotifications()

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          Notifications
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead()}
            className="text-xs font-medium"
            style={{ color: 'var(--color-teal)' }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto -mx-1 px-1">
        <NotificationList notifications={notifications.slice(0, MAX_PANEL_ITEMS)} onItemClick={onNavigate} />
      </div>

      <div className="pt-2.5 mt-1 border-t px-1" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          href="/admin/notifications"
          onClick={onNavigate}
          className="text-xs font-medium"
          style={{ color: 'var(--color-teal)' }}
        >
          View all
        </Link>
      </div>

      <PushOptInRow />
    </div>
  )
}

/** Only rendered when push is configured, supported, not yet subscribed, and not denied —
 *  otherwise there's nothing actionable to show the admin here. */
function PushOptInRow() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const { supported, permission } = getLocalPushStatus()
      if (!vapidKey || !supported || permission === 'denied') return

      try {
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (!cancelled && !existing) setVisible(true)
      } catch {
        // Service worker not registered/ready yet — nothing to opt into.
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) return null

  async function handleSubscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    setLoading(true)
    try {
      const { subscription, error } = await subscribeToPush(vapidKey)
      if (error || !subscription) {
        toast.error('Could not enable notifications', { description: error ?? undefined })
        return
      }

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error('Could not enable notifications', { description: 'Unexpected subscription shape' })
        return
      }

      const result = await savePushSubscription(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent
      )
      if (result.error) {
        toast.error('Could not save subscription', { description: result.error })
        return
      }

      toast.success('Notifications enabled on this device')
      setVisible(false)
    } catch (err) {
      toast.error('Something went wrong', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 pt-2.5 border-t px-1" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="flex w-full items-center gap-2 text-xs font-medium disabled:opacity-60"
        style={{ color: 'var(--color-teal)' }}
      >
        <BellRinging size={14} weight="fill" />
        {loading ? 'Enabling…' : 'Get notified on this device'}
      </button>
    </div>
  )
}
