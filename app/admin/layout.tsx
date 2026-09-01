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
import { AppUpdateNotifier } from '@/components/admin/AppUpdateNotifier'
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

  const [pendingRes, activeOrdersRes, notificationsRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // "Active orders" = confirmed but not yet delivered — the natural needs-attention
    // bucket now that the 'ready' status no longer exists.
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed'),
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  const pendingCount = pendingRes.count ?? 0
  const activeOrdersCount = activeOrdersRes.count ?? 0
  const initialNotifications = (notificationsRes.data ?? []) as Notification[]

  return (
    <NotificationProvider initialNotifications={initialNotifications}>
      <NavPendingProvider>
        <AdminHeaderProvider>
          <ServiceWorkerRegistration />
          <AppUpdateNotifier />
          {/* Row at the top level: the sidebar first, then a column carrying
              everything else — top bar, scroll region, bottom nav — so the
              desktop top bar starts where the sidebar ends instead of
              spanning full-width above it. On mobile the sidebar collapses to
              nothing and the column is naturally full-width. */}
          <div className="flex h-svh" style={{ backgroundColor: 'var(--color-surface)' }}>
            <AdminSidebar pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} user={user} />

            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <AdminTopBar />
              <AdminMobileTopBar />

              <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
                <AdminScrollRegion>{children}</AdminScrollRegion>

                <NavigationOverlay />
              </div>

              <AdminBottomNav pendingCount={pendingCount} activeOrdersCount={activeOrdersCount} />
            </div>
          </div>
        </AdminHeaderProvider>
      </NavPendingProvider>
    </NotificationProvider>
  )
}
