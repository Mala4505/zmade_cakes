'use client'

import { useState } from 'react'

interface Props {
  templates: string[]
  customerName: string
  trackingLink: string
  amount: string
}

function fillTemplate(tmpl: string, vars: Record<string, string>) {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

export default function WhatsAppCopy({ templates, customerName, trackingLink, amount }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const vars = { name: customerName, link: trackingLink, amount }

  if (!templates.length) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
        WhatsApp templates
      </p>
      {templates.map((tmpl, i) => {
        const filled = fillTemplate(tmpl, vars)
        const isCopied = copiedIdx === i
        return (
          <div
            key={i}
            className="rounded-lg border p-3 text-sm"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          >
            <p className="mb-2 whitespace-pre-wrap" style={{ color: 'var(--color-ink-muted)' }}>
              {filled}
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(filled)
                setCopiedIdx(i)
                setTimeout(() => setCopiedIdx(null), 2000)
              }}
              className="rounded-md border px-3 py-1 text-xs font-medium transition-all"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--color-border-strong)',
                color: isCopied ? 'var(--color-teal)' : 'var(--color-ink)',
              }}
            >
              {isCopied ? 'Copied!' : 'Copy message'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
