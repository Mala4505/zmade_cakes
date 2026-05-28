'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateSetting } from '@/lib/actions/settings'

export default function OperatingRulesForm({ initialLeadDays }: { initialLeadDays: number }) {
  const [value, setValue] = useState(initialLeadDays)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateSetting('min_lead_days', String(value))
      if (result.error) {
        toast.error('Failed to save', { description: result.error })
        return
      }
      toast.success('Operating rules saved')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div>
          <label
            htmlFor="min_lead_days"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Minimum lead time (days)
          </label>
          <input
            id="min_lead_days"
            type="number"
            min={0}
            max={90}
            step={1}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
            Inquiries with event dates within this window will show a warning
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60 mt-4"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
