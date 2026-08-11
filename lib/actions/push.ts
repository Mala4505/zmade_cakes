'use server'
import { createClient } from '@/lib/supabase/server'
import type { PushSubscriptionRow } from '@/lib/supabase/types'
import { sendPushToAdmin } from '@/lib/push'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function savePushSubscription(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}

export async function listPushSubscriptions(): Promise<ActionResult<PushSubscriptionRow[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('last_seen_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

export async function sendTestPush(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  try {
    await sendPushToAdmin('general', {
      title: 'Test Notification',
      body: 'If you can see this, push notifications are working.',
      url: '/admin',
      notificationId: 'test-' + Date.now(),
    })
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to send test notification' }
  }

  return { data: undefined, error: null }
}
