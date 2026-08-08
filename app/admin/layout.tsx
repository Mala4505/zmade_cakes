import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar, AdminBottomNav, AdminMobileTopBar } from '@/components/admin/AdminNav'
import { NavPendingProvider } from '@/components/admin/NavPendingContext'
import { NavigationOverlay } from '@/components/admin/NavigationOverlay'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [pendingRes, readyRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready'),
  ])
  const pendingCount = pendingRes.count ?? 0
  const readyCount = readyRes.count ?? 0

  return (
    <NavPendingProvider>
      <div className="flex min-h-svh" style={{ backgroundColor: 'var(--color-surface)' }}>
        <AdminSidebar pendingCount={pendingCount} readyCount={readyCount} user={user} />

        <div className="relative flex-1 flex flex-col min-w-0">
          <AdminMobileTopBar />

          <main className="admin-main flex-1 pb-20 md:pb-0" style={{ backgroundColor: 'var(--color-cream)' }}>
            {children}
          </main>

          <NavigationOverlay />
        </div>

        <AdminBottomNav pendingCount={pendingCount} readyCount={readyCount} />
      </div>
    </NavPendingProvider>
  )
}
