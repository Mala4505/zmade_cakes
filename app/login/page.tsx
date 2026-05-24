import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './_components/LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/admin')

  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}
          >
            ZMade Cakes
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
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
