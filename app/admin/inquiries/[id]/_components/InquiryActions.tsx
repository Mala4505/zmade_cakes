'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateInquiryStatus } from '@/lib/actions/inquiries'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  Spinner,
  WhatsappLogo,
  Link as LinkIcon,
  Copy,
  Check,
} from '@phosphor-icons/react'
import type { Inquiry, InquiryStatus, WhatsAppTemplates } from '@/lib/supabase/types'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'
import { balanceOwed } from '@/lib/payments'

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

const NEXT_STEP: Record<string, { label: string; Icon: React.ElementType } | null> = {
  pending: { label: 'Mark as Awaiting', Icon: Clock },
  awaiting_confirmation: { label: 'Mark as Confirmed', Icon: CheckCircle },
  confirmed: { label: 'Mark as Ready', Icon: Package },
  ready: { label: 'Mark as Dispatched', Icon: Truck },
  delivered: null,
  cancelled: null,
}

const STATUS_PROGRESSION: Record<string, InquiryStatus> = {
  pending: 'awaiting_confirmation',
  awaiting_confirmation: 'confirmed',
  confirmed: 'ready',
  ready: 'delivered',
}

export default function InquiryActions({
  inquiry,
  confirmLink,
  templates,
}: {
  inquiry: Inquiry & { payment_status?: string }
  confirmLink: string
  templates?: WhatsAppTemplates
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const nextStep = NEXT_STEP[inquiry.status]
  const nextStatus = STATUS_PROGRESSION[inquiry.status]

  const handleNextStep = () => {
    if (!nextStatus) return
    startTransition(async () => {
      const result = await updateInquiryStatus(inquiry.id, nextStatus)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status updated')
        router.refresh()
      }
    })
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(confirmLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const firstName = inquiry.customer_name.split(' ')[0]
  const balance = inquiry.admin_price
    ? balanceOwed(inquiry.admin_price, inquiry.advance_amount, inquiry.advance_paid, inquiry.fully_paid)
    : null
  const hasOutstandingBalance = balance !== null && balance > 0

  const notConfirmed = !inquiry.customer_confirmed
  const isConfirmedOrBeyond =
    inquiry.status === 'confirmed' || inquiry.status === 'ready'
  const isCancelled = inquiry.status === 'cancelled'
  const isDelivered = inquiry.status === 'delivered'

  if (isCancelled || isDelivered) return null

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Next Step banner */}
      {nextStep && (
        <div
          className="rounded-xl p-3 px-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-teal-light)', border: '1px solid #b2dbd9' }}
        >
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-teal-deep)' }}
          >
            Next Step
          </span>
          <button
            type="button"
            onClick={handleNextStep}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {pending ? (
              <Spinner size={14} className="animate-spin" />
            ) : (
              <nextStep.Icon size={14} />
            )}
            {nextStep.label}
          </button>
        </div>
      )}

      {/* WhatsApp Quick Messages */}
      <div
        className="rounded-xl border p-4 flex flex-col gap-2.5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Quick Message
        </p>

        {/* Not confirmed + has price: Send Confirmation */}
        {notConfirmed && !!inquiry.admin_price && (
          <div className="flex gap-2">
            <a
              href={whatsappUrl(
                inquiry.customer_phone,
                interpolate(templates?.confirmationLink ?? DEFAULT_WHATSAPP_TEMPLATES.confirmationLink, {
                  name: firstName,
                  link: confirmLink,
                })
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
              style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
            >
              <WhatsappLogo size={15} weight="fill" />
              Send Confirmation
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.97]"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-ink-secondary)',
              }}
            >
              {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        )}

        {/* Confirmed + making/ready: Order Ready */}
        {isConfirmedOrBeyond && (
          <a
            href={whatsappUrl(
              inquiry.customer_phone,
              interpolate(templates?.orderReady ?? DEFAULT_WHATSAPP_TEMPLATES.orderReady, { name: firstName })
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            <WhatsappLogo size={15} weight="fill" />
            Order Ready
          </a>
        )}

        {/* Outstanding balance reminder */}
        {hasOutstandingBalance && (
          <a
            href={whatsappUrl(
              inquiry.customer_phone,
              interpolate(templates?.balanceDue ?? DEFAULT_WHATSAPP_TEMPLATES.balanceDue, {
                name: firstName,
                amount: (balance ?? 0).toFixed(3),
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
            style={{ backgroundColor: '#1a9e4c', color: '#fff' }}
          >
            <WhatsappLogo size={15} weight="fill" />
            Balance Due — KD {(balance ?? 0).toFixed(3)}
          </a>
        )}

        {/* Always: Message Customer */}
        <a
          href={whatsappUrlNoText(inquiry.customer_phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.97]"
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
    </div>
  )
}
