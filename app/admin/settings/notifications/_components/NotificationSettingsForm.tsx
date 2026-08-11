'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import { updateSetting } from '@/lib/actions/settings'
import { deletePushSubscription, savePushSubscription, sendTestPush } from '@/lib/actions/push'
import { getLocalPushStatus, subscribeToPush, unsubscribeFromPush } from '@/lib/push-client'
import type { NotificationPrefs, NotificationType, PushSubscriptionRow } from '@/lib/supabase/types'

const TYPE_CONFIG: { key: NotificationType; label: string; description: string }[] = [
  { key: 'inquiry_created', label: 'New inquiry', description: 'When a customer submits a new inquiry' },
  { key: 'customer_confirmed', label: 'Customer confirms', description: 'When a customer confirms their order' },
  { key: 'order_update', label: 'Order ready/dispatched', description: 'When you mark an order ready or dispatched' },
  { key: 'general', label: 'Customer requests changes', description: 'When a customer asks to change their order' },
]

function describeUserAgent(ua: string): string {
  if (!ua) return 'Unknown device'
  if (/Android/i.test(ua)) return 'Android device'
  if (/iPhone|iPad/i.test(ua)) return 'iOS device'
  if (/Windows/i.test(ua)) return 'Windows PC'
  if (/Macintosh/i.test(ua)) return 'Mac'
  return 'Unknown device'
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

export default function NotificationSettingsForm({
  initialPrefs,
  initialSubscriptions,
}: {
  initialPrefs: NotificationPrefs
  initialSubscriptions: PushSubscriptionRow[]
}) {
  const router = useRouter()
  const [prefs, setPrefs] = useState(initialPrefs)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [localSupported, setLocalSupported] = useState(false)
  const [localPermission, setLocalPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [removingEndpoint, setRemovingEndpoint] = useState<string | null>(null)

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    const status = getLocalPushStatus()
    setLocalSupported(status.supported)
    setLocalPermission(status.permission)

    async function checkSubscription() {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        setSubscribed(false)
        return
      }
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        setSubscribed(!!sub)
      } catch {
        setSubscribed(false)
      }
    }
    checkSubscription()
  }, [])

  function savePrefs(nextPrefs: NotificationPrefs, key: string, successMessage: string) {
    const prevPrefs = prefs
    setPrefs(nextPrefs)
    setPendingKey(key)
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave the pending state
      // stuck true forever with no feedback shown.
      try {
        const { error } = await updateSetting('notification_prefs', nextPrefs)
        if (error) {
          setPrefs(prevPrefs)
          toast.error('Failed to save', { description: error })
          return
        }
        toast.success(successMessage)
      } catch (err) {
        setPrefs(prevPrefs)
        console.error('[NotificationSettingsForm] save failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      } finally {
        setPendingKey(null)
      }
    })
  }

  function handleMasterToggle(next: boolean) {
    savePrefs(
      { ...prefs, push_enabled: next },
      'master',
      next ? 'Push notifications enabled' : 'Push notifications disabled'
    )
  }

  function handleTypeToggle(type: NotificationType, next: boolean) {
    savePrefs(
      { ...prefs, types: { ...prefs.types, [type]: next } },
      type,
      'Changes saved'
    )
  }

  async function handleEnableDevice() {
    if (!vapidKey) return
    setDeviceBusy(true)
    try {
      const { subscription, error } = await subscribeToPush(vapidKey)
      if (error || !subscription) {
        toast.error('Failed to enable notifications', { description: error ?? 'Please try again.' })
        return
      }
      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } }
      if (!json.endpoint || !json.keys) {
        toast.error('Failed to enable notifications', { description: 'Subscription is missing required data.' })
        return
      }
      const result = await savePushSubscription(
        { endpoint: json.endpoint, keys: json.keys },
        navigator.userAgent
      )
      if (result.error) {
        toast.error('Failed to save this device', { description: result.error })
        return
      }
      setSubscribed(true)
      toast.success('Notifications enabled on this device')
      router.refresh()
    } catch (err) {
      console.error('[NotificationSettingsForm] enable device failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setDeviceBusy(false)
    }
  }

  async function handleDisableDevice() {
    setDeviceBusy(true)
    try {
      let endpoint: string | null = null
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        endpoint = sub?.endpoint ?? null
      }
      await unsubscribeFromPush()
      if (endpoint) {
        const result = await deletePushSubscription(endpoint)
        if (result.error) {
          toast.error('Failed to remove this device', { description: result.error })
        }
      }
      setSubscribed(false)
      toast.success('Notifications disabled on this device')
      router.refresh()
    } catch (err) {
      console.error('[NotificationSettingsForm] disable device failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setDeviceBusy(false)
    }
  }

  async function handleTestPush() {
    setTestBusy(true)
    try {
      const { error } = await sendTestPush()
      if (error) {
        toast.error('Failed to send test notification', { description: error })
        return
      }
      toast.success('Test notification sent')
    } catch (err) {
      console.error('[NotificationSettingsForm] test push failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setTestBusy(false)
    }
  }

  async function handleRemoveDevice(endpoint: string) {
    setRemovingEndpoint(endpoint)
    try {
      const result = await deletePushSubscription(endpoint)
      if (result.error) {
        toast.error('Failed to remove device', { description: result.error })
        return
      }
      toast.success('Device removed')
      router.refresh()
    } catch (err) {
      console.error('[NotificationSettingsForm] remove device failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setRemovingEndpoint(null)
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <Switch
          label="Push Notifications"
          description="Turn all push alerts on or off"
          checked={prefs.push_enabled}
          disabled={pendingKey === 'master'}
          onChange={(e) => handleMasterToggle(e.target.checked)}
        />
      </div>

      <div
        className={cn(
          'rounded-xl border p-4 space-y-4 transition-opacity',
          !prefs.push_enabled && 'opacity-50'
        )}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {TYPE_CONFIG.map(({ key, label, description }) => (
          <Switch
            key={key}
            label={label}
            description={description}
            checked={prefs.types[key]}
            disabled={pendingKey === key}
            onChange={(e) => handleTypeToggle(key, e.target.checked)}
          />
        ))}
      </div>

      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div>
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            This Device
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            Manage push notifications on the device you&apos;re using now
          </p>
        </div>

        {!localSupported ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            This browser doesn&apos;t support push notifications.
          </p>
        ) : !vapidKey ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Push notifications aren&apos;t configured yet.
          </p>
        ) : localPermission === 'denied' ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Notifications are blocked for this site in your browser settings.
          </p>
        ) : subscribed ? (
          <button
            type="button"
            onClick={handleDisableDevice}
            disabled={deviceBusy}
            className="w-full py-2.5 rounded-lg text-sm font-medium border transition-opacity disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
          >
            {deviceBusy ? 'Working…' : 'Disable on this device'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnableDevice}
            disabled={deviceBusy || subscribed === null}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {deviceBusy ? 'Working…' : 'Enable notifications on this device'}
          </button>
        )}

        <button
          type="button"
          onClick={handleTestPush}
          disabled={testBusy}
          className="w-full py-2.5 rounded-lg text-sm font-medium border transition-opacity disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
        >
          {testBusy ? 'Sending…' : 'Send test notification'}
        </button>

        {initialSubscriptions.length > 0 && (
          <div className="pt-2 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            {initialSubscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>
                    {describeUserAgent(sub.user_agent)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                    Last seen {relativeTime(sub.last_seen_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDevice(sub.endpoint)}
                  disabled={removingEndpoint === sub.endpoint}
                  className="shrink-0 text-xs font-medium disabled:opacity-60"
                  style={{ color: 'var(--color-danger)' }}
                >
                  {removingEndpoint === sub.endpoint ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
