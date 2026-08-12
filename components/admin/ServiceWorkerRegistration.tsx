'use client';

import { useEffect } from 'react';
import { getLocalPushStatus, subscribeToPush } from '@/lib/push-client';
import { savePushSubscription } from '@/lib/actions/push';

// Auto-prompt for push permission the moment the *installed* app is opened
// (standalone display mode) — not on a regular browser tab visit, and not
// again once the admin has already granted/denied/subscribed.
async function maybeAutoSubscribe() {
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!isInstalled) return;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const { supported, permission } = getLocalPushStatus();
  if (!vapidKey || !supported || permission === 'denied') return;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return;

  const { subscription, error } = await subscribeToPush(vapidKey);
  if (error || !subscription) return;

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  if (!json.endpoint || !json.keys) return;

  await savePushSubscription({ endpoint: json.endpoint, keys: json.keys }, navigator.userAgent);
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(() => {
      maybeAutoSubscribe().catch(() => {
        // Best-effort — the manual "Enable notifications" controls in Settings
        // and the bell panel remain as a fallback if this silently fails.
      });
    });
  }, []);

  return null;
}
