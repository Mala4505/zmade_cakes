'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000') + '/login/reset',
    })
    setPending(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-sm text-center py-4" style={{ color: 'var(--color-ink)' }}>
        Check your inbox — a reset link has been sent to <strong>{email}</strong>.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="zainab@example.com"
          className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
          style={{ backgroundColor: 'var(--color-cream)', borderColor: 'var(--color-border)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-teal-light)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>
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
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
