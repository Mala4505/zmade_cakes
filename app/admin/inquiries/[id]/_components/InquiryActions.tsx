'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendConfirmationLink, cancelInquiry } from '@/lib/actions/inquiries'
import { Copy, Check, Link as LinkIcon, X, WhatsappLogo } from '@phosphor-icons/react'
import type { Inquiry, WhatsAppTemplates } from '@/lib/supabase/types'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

function whatsappUrl(phone: string, text: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('965') ? cleaned : `965${cleaned}`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function whatsappUrlNoText(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('965') ? cleaned : `965${cleaned}`
  return `https://wa.me/${number}`
}

export default function InquiryActions({
  inquiry,
  confirmLink,
  templates,
}: {
  inquiry: Inquiry
  confirmLink: string
  templates?: WhatsAppTemplates
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(confirmLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendLink = () => {
    startTransition(async () => {
      const result = await sendConfirmationLink(inquiry.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleCancel = () => {
    if (!confirm('Cancel this inquiry? This cannot be undone.')) return
    startTransition(async () => {
      const result = await cancelInquiry(inquiry.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const canSendLink = inquiry.status === 'pending' && !!inquiry.admin_price
  const isCancelled = inquiry.status === 'cancelled'
  const isConfirmed = inquiry.customer_confirmed

  const firstName = inquiry.customer_name.split(' ')[0]
  const balanceStr =
    inquiry.admin_price && inquiry.advance_amount
      ? (parseFloat(inquiry.admin_price) - parseFloat(inquiry.advance_amount)).toFixed(3)
      : null
  const showBalanceReminder = !!inquiry.admin_price && !!inquiry.advance_amount && !inquiry.balance_paid

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      )}

      {!isCancelled && !isConfirmed && (
        <div
          className="rounded-xl border p-4 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
            Confirmation Link
          </p>

          {!inquiry.admin_price && (
            <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
              Set a price before sending the confirmation link.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-ink-secondary)',
              }}
            >
              {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            {canSendLink && (
              <a
                href={whatsappUrl(
                  inquiry.customer_phone,
                  interpolate(templates?.confirmationLink ?? DEFAULT_WHATSAPP_TEMPLATES.confirmationLink, { name: firstName, link: confirmLink })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                <WhatsappLogo size={15} weight="fill" />
                Send on WhatsApp
              </a>
            )}

            {canSendLink && (
              <button
                type="button"
                onClick={handleSendLink}
                disabled={pending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--color-teal)',
                  color: 'var(--color-cream)',
                }}
              >
                <LinkIcon size={15} />
                {pending ? 'Sending…' : 'Mark as Sent'}
              </button>
            )}
          </div>

          <p className="text-xs break-all" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
            {confirmLink}
          </p>
        </div>
      )}

      {isConfirmed && inquiry.status !== 'cancelled' && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ borderColor: 'var(--color-teal-light)', backgroundColor: 'var(--color-teal-light)' }}
        >
          <Check size={16} weight="bold" style={{ color: 'var(--color-teal)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-teal-deep)' }}>
            Customer confirmed this order
          </p>
        </div>
      )}

      {isConfirmed && inquiry.status !== 'cancelled' && (
        <div
          className="rounded-xl border p-4 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
            Quick Message
          </p>

          <a
            href={whatsappUrl(
              inquiry.customer_phone,
              interpolate(templates?.orderReady ?? DEFAULT_WHATSAPP_TEMPLATES.orderReady, { name: firstName })
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            <WhatsappLogo size={15} weight="fill" />
            Order Ready
          </a>

          {showBalanceReminder && (
            <a
              href={whatsappUrl(
                inquiry.customer_phone,
                interpolate(templates?.balanceDue ?? DEFAULT_WHATSAPP_TEMPLATES.balanceDue, { name: firstName, amount: balanceStr ?? '0.000' })
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#25D366', color: '#fff' }}
            >
              <WhatsappLogo size={15} weight="fill" />
              Balance Due
            </a>
          )}

          <a
            href={whatsappUrlNoText(inquiry.customer_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-ink-secondary)',
            }}
          >
            <WhatsappLogo size={15} weight="fill" />
            Message Customer
          </a>
        </div>
      )}

      {!isCancelled && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'var(--color-danger-light)',
            backgroundColor: 'transparent',
            color: 'var(--color-danger)',
          }}
        >
          <X size={15} />
          Cancel Inquiry
        </button>
      )}
    </div>
  )
}
