'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

export default function ResetPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else router.replace('/login/forgot')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setPending(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (err) { setError(err.message); return }
    router.replace('/admin/calendar')
  }

  if (!ready) return null

  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image src="/logo.svg" alt="ZMade Cakes" width={96} height={96} className="rounded-xl" priority />
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Set a new password</p>
        </div>
        <div className="rounded-xl border p-8"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {(['password', 'confirm'] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label htmlFor={field} className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                  {field === 'password' ? 'New password' : 'Confirm password'}
                </label>
                <input
                  id={field}
                  type="password"
                  autoComplete={field === 'password' ? 'new-password' : 'new-password'}
                  required
                  value={field === 'password' ? password : confirm}
                  onChange={(e) => field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{ backgroundColor: 'var(--color-cream)', borderColor: 'var(--color-border)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-teal-light)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            ))}
            {error && (
              <p className="rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }} role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full rounded-lg py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed"
              style={{ backgroundColor: pending ? 'var(--color-teal-light)' : 'var(--color-teal)', color: pending ? 'var(--color-teal-deep)' : 'var(--color-cream)' }}
              onMouseEnter={(e) => { if (!pending) e.currentTarget.style.backgroundColor = 'var(--color-teal-deep)' }}
              onMouseLeave={(e) => { if (!pending) e.currentTarget.style.backgroundColor = 'var(--color-teal)' }}
            >
              {pending ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
