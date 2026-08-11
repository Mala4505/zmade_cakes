import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import { listPushSubscriptions } from '@/lib/actions/push'
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/lib/supabase/types'
import NotificationSettingsForm from './_components/NotificationSettingsForm'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationSettingsPage() {
  const [settingsResult, subscriptionsResult] = await Promise.all([
    getSettings(['notification_prefs']),
    listPushSubscriptions(),
  ])

  const rawPrefs = settingsResult.data?.notification_prefs
  const prefs: NotificationPrefs =
    rawPrefs && typeof rawPrefs === 'object'
      ? (rawPrefs as NotificationPrefs)
      : DEFAULT_NOTIFICATION_PREFS

  const subscriptions = subscriptionsResult.data ?? []

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <PageHeader title="Notifications" subtitle="Push alerts and what triggers them" />
      <div className="mt-6">
        <NotificationSettingsForm initialPrefs={prefs} initialSubscriptions={subscriptions} />
      </div>
    </div>
  )
}
