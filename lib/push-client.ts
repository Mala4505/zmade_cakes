// Browser-only helpers for the Web Push (VAPID) subscription flow.
// Must only ever be called from client components — these functions touch
// `navigator`/`Notification`/`window` directly.

export function getLocalPushStatus(): { supported: boolean; permission: NotificationPermission } {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { supported: false, permission: 'default' }
  }

  const supported = 'serviceWorker' in navigator && 'PushManager' in window
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default'

  return { supported, permission }
}

// Standard base64url -> Uint8Array converter for VAPID applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function subscribeToPush(
  vapidPublicKey: string
): Promise<{ subscription: PushSubscription | null; error: string | null }> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof window === 'undefined' || !('PushManager' in window)) {
      return { subscription: null, error: 'Push notifications are not supported in this browser' }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { subscription: null, error: 'Notification permission was not granted' }
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    return { subscription, error: null }
  } catch (err) {
    return { subscription: null, error: err instanceof Error ? err.message : 'Failed to subscribe to push notifications' }
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return false

    return await subscription.unsubscribe()
  } catch {
    return false
  }
}
