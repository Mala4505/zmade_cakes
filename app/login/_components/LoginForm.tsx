'use client'

import { useActionState } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Input } from '@/components/ui'

export default function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null)

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="zainab@example.com"
          size="base"
          style={{ fontFamily: 'var(--font-sans)' }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-medium"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          size="base"
          style={{ fontFamily: 'var(--font-sans)' }}
        />
      </div>

      <div className="text-right">
        <a
          href="/login/forgot"
          className="text-xs"
          style={{ color: 'var(--color-ink-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-teal)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink-muted)')}
        >
          Forgot password?
        </a>
      </div>

      {error && (
        <p
          className="rounded-lg px-3.5 py-2.5 text-sm"
          style={{
            backgroundColor: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-lg py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed"
        style={{
          backgroundColor: pending ? 'var(--color-teal-light)' : 'var(--color-teal)',
          color: pending ? 'var(--color-teal-deep)' : 'var(--color-cream)',
        }}
        onMouseEnter={(e) => {
          if (!pending) e.currentTarget.style.backgroundColor = 'var(--color-teal-deep)'
        }}
        onMouseLeave={(e) => {
          if (!pending) e.currentTarget.style.backgroundColor = 'var(--color-teal)'
        }}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
