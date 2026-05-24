import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar, AdminBottomNav } from '@/components/admin/AdminNav'

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
      .in('status', ['pending', 'awaiting_confirmation']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready'),
  ])
  const pendingCount = pendingRes.count ?? 0
  const readyCount = readyRes.count ?? 0

  return (
    <div className="flex min-h-svh" style={{ backgroundColor: 'var(--color-cream)' }}>
      <AdminSidebar pendingCount={pendingCount} readyCount={readyCount} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="md:hidden flex items-center h-14 px-4 border-b shrink-0 sticky top-0 z-30"
          style={{
            backgroundColor: 'var(--color-cream)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            ZMade Cakes
          </span>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <AdminBottomNav pendingCount={pendingCount} readyCount={readyCount} />
    </div>
  )
}
