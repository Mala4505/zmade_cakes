import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './_components/LoginForm'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/admin/calendar')

  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image src="/logo.svg" alt="ZMade Cakes" width={96} height={96} className="rounded-xl" priority />
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Order management
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-xl border p-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
