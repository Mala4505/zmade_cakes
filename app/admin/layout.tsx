import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar, AdminBottomNav } from '@/components/admin/AdminNav'
import Image from 'next/image'

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
    <div className="flex min-h-svh" style={{ backgroundColor: 'var(--color-surface)' }}>
      <AdminSidebar pendingCount={pendingCount} readyCount={readyCount} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="md:hidden flex items-center h-14 px-4 border-b shrink-0 sticky top-0 z-30"
          style={{
            backgroundColor: 'var(--color-cream)',
            borderColor: 'var(--color-border)',
            boxShadow: '0 1px 0 var(--color-border)',
          }}
        >
          <Image src="/logo.svg" alt="ZMade Cakes" width={80} height={32} style={{ width: 'auto', height: '28px' }} priority />
        </header>

        <main className="admin-main flex-1 pb-20 md:pb-0" style={{ backgroundColor: '#ffffff' }}>
          {children}
        </main>
      </div>

      <AdminBottomNav pendingCount={pendingCount} readyCount={readyCount} />
    </div>
  )
}
