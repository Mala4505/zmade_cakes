'use client'

import { useState } from 'react'
import { updateSetting } from '@/lib/actions/settings'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import type { WhatsAppTemplates } from '@/lib/supabase/types'

const TEMPLATE_FIELDS: {
  key: keyof WhatsAppTemplates
  label: string
  variables: string
}[] = [
  { key: 'confirmationLink', label: 'Confirmation Link', variables: '{name}, {link}' },
  { key: 'orderDelivered', label: 'Order Delivered', variables: '{name}' },
  { key: 'balanceDue', label: 'Balance Due', variables: '{name}, {amount}' },
  { key: 'trackingLink', label: 'Tracking Link', variables: '{name}, {link}' },
  { key: 'myOrdersLink', label: 'My Orders Link', variables: '{name}, {link}' },
  { key: 'paymentReceived', label: 'Payment Received', variables: '{name}, {amount}, {paid}, {total}, {balance}, {link}' },
]

export default function WhatsAppTemplatesForm({
  initialTemplates,
}: {
  initialTemplates: WhatsAppTemplates
}) {
  const [templates, setTemplates] = useState<WhatsAppTemplates>(initialTemplates)

  const { run, pending } = useAsyncAction(
    async () => {
      const result = await updateSetting('whatsapp_templates', templates)
      if (result.error) return { error: result.error }
    },
    { successToast: 'Templates saved', errorToast: 'Failed to save templates' }
  )

  function handleChange(key: keyof WhatsAppTemplates, value: string) {
    setTemplates((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    run()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-xl border p-4 space-y-5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {TEMPLATE_FIELDS.map(({ key, label, variables }) => (
          <div key={key}>
            <label
              htmlFor={key}
              className="block text-xs font-medium mb-0.5"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              {label}
            </label>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
              Variables: {variables}
            </p>
            <textarea
              id={key}
              rows={4}
              value={templates[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all resize-y"
              style={{
                backgroundColor: 'var(--color-cream)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-ink)',
              }}
            />
          </div>
        ))}

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
