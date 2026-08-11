import webpush from 'web-push'
import { env } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/server'
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
  type NotificationType,
} from '@/lib/supabase/types'

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)
  vapidConfigured = true
}

interface PushPayload {
  title: string
  body: string
  url: string
  notificationId: string
}

// Sends a Web Push notification to every registered admin device. No-ops silently when
// VAPID isn't configured (push is an optional feature — see lib/env.ts) or when the admin
// has disabled push / this notification type in business_settings.notification_prefs.
// Never throws — a push failure should never block or fail the caller's action.
export async function sendPushToAdmin(type: NotificationType, payload: PushPayload): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return

  ensureVapidConfigured()

  const supabase = createServiceClient()

  const { data: prefsRow, error: prefsError } = await supabase
    .from('business_settings')
    .select('value')
    .eq('key', 'notification_prefs')
    .maybeSingle()

  if (prefsError) {
    console.error('[sendPushToAdmin] failed to load notification_prefs:', prefsError.message)
    return
  }

  const prefs = (prefsRow?.value as NotificationPrefs | undefined) ?? DEFAULT_NOTIFICATION_PREFS
  if (!prefs.push_enabled || !prefs.types[type]) return

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (subsError) {
    console.error('[sendPushToAdmin] failed to load push_subscriptions:', subsError.message)
    return
  }

  if (!subscriptions || subscriptions.length === 0) return

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    notificationId: payload.notificationId,
  })

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked by the browser/push service — clean it up.
          const { error: deleteError } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          if (deleteError) {
            console.error('[sendPushToAdmin] failed to delete stale subscription:', deleteError.message)
          }
        } else {
          console.error('[sendPushToAdmin] send failed:', err)
        }
      }
    })
  )
}
