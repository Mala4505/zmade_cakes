import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminTopBar, AdminSidebar, AdminBottomNav, AdminMobileTopBar } from '@/components/admin/AdminNav'
import { AdminScrollRegion } from '@/components/admin/AdminScrollRegion'
import { AdminHeaderProvider } from '@/components/admin/AdminHeaderContext'
import { NavPendingProvider } from '@/components/admin/NavPendingContext'
import { NavigationOverlay } from '@/components/admin/NavigationOverlay'
import { NotificationProvider } from '@/components/admin/NotificationContext'
import { ServiceWorkerRegistration } from '@/components/admin/ServiceWorkerRegistration'
import type { Notification } from '@/lib/supabase/types'

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ZMade Admin' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [pendingRes, readyRes, notificationsRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready'),
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  const pendingCount = pendingRes.count ?? 0
  const readyCount = readyRes.count ?? 0
  const initialNotifications = (notificationsRes.data ?? []) as Notification[]

  return (
    <NotificationProvider initialNotifications={initialNotifications}>
      <NavPendingProvider>
        <AdminHeaderProvider>
          <ServiceWorkerRegistration />
          {/* Column at the top level: whichever header is showing, then the
              sidebar/content row, then the bottom nav — all three genuinely
              full-width and stacked, not row-siblings competing for width. */}
          <div className="flex flex-col h-svh" style={{ backgroundColor: 'var(--color-surface)' }}>
            <AdminTopBar />
            <AdminMobileTopBar />

            <div className="flex flex-1 min-h-0">
              <AdminSidebar pendingCount={pendingCount} readyCount={readyCount} user={user} />

              <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
                <AdminScrollRegion>{children}</AdminScrollRegion>

                <NavigationOverlay />
              </div>
            </div>

            <AdminBottomNav pendingCount={pendingCount} readyCount={readyCount} />
          </div>
        </AdminHeaderProvider>
      </NavPendingProvider>
    </NotificationProvider>
  )
}
