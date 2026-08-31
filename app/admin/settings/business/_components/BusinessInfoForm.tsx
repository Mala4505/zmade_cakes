'use client'

import { useState } from 'react'
import { updateSetting } from '@/lib/actions/settings'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'

export default function BusinessInfoForm({
  initialPhone,
  initialInstagram,
}: {
  initialPhone: string
  initialInstagram: string
}) {
  const [phone, setPhone] = useState(initialPhone)
  const [instagram, setInstagram] = useState(initialInstagram)

  const { run, pending } = useAsyncAction(
    async () => {
      const [r1, r2] = await Promise.all([
        updateSetting('business_phone', phone),
        updateSetting('business_instagram', instagram),
      ])
      if (r1.error || r2.error) return { error: r1.error ?? r2.error ?? 'Failed to save' }
    },
    { successToast: 'Changes saved' }
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    run()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div>
          <label
            htmlFor="business_phone"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            WhatsApp Phone Number
          </label>
          <input
            id="business_phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="business_instagram"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Instagram Handle
          </label>
          <input
            id="business_instagram"
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          {pending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
