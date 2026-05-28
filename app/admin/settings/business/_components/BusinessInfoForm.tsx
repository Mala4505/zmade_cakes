'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateSetting } from '@/lib/actions/settings'

export default function BusinessInfoForm({
  initialPhone,
  initialInstagram,
}: {
  initialPhone: string
  initialInstagram: string
}) {
  const [phone, setPhone] = useState(initialPhone)
  const [instagram, setInstagram] = useState(initialInstagram)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        updateSetting('business_phone', phone),
        updateSetting('business_instagram', instagram),
      ])
      if (r1.error || r2.error) {
        toast.error('Failed to save', { description: r1.error ?? r2.error ?? 'Failed to save' })
        return
      }
      toast.success('Changes saved')
    })
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
          disabled={isPending}
          className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
