import type { Metadata } from 'next'
import { NotificationsFullList } from './_components/NotificationsFullList'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <NotificationsFullList />
    </div>
  )
}
