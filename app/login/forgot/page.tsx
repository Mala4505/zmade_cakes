import type { Metadata } from 'next'
import Image from 'next/image'
import ForgotForm from './_components/ForgotForm'

export const metadata: Metadata = { title: 'Reset Password' }

export default function ForgotPage() {
  return (
    <main className="min-h-svh flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image src="/logo.svg" alt="ZMade Cakes" width={96} height={96} className="rounded-xl" priority />
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Reset your password
          </p>
        </div>
        <div className="rounded-xl border p-8"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <ForgotForm />
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          <a href="/login" style={{ color: 'var(--color-teal)' }}>Back to sign in</a>
        </p>
      </div>
    </main>
  )
}
