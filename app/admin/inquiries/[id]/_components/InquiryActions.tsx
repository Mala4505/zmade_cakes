'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateInquiryStatus } from '@/lib/actions/inquiries'
import { toast } from 'sonner'
import {
  CheckCircle,
  Package,
  Truck,
  Spinner,
  WhatsappLogo,
  Copy,
  Check,
} from '@phosphor-icons/react'
import type { Inquiry, InquiryStatus, WhatsAppTemplates } from '@/lib/supabase/types'
import { pickWhatsAppAction, whatsappUrlNoText } from '@/lib/whatsapp'
import WhatsAppButton from '@/components/admin/WhatsAppButton'

const NEXT_STEP: Record<string, { label: string; Icon: React.ElementType } | null> = {
  pending: { label: 'Mark as Confirmed', Icon: CheckCircle },
  confirmed: { label: 'Mark as Ready', Icon: Package },
  ready: { label: 'Mark as Dispatched', Icon: Truck },
  delivered: null,
  cancelled: null,
}

const STATUS_PROGRESSION: Record<string, InquiryStatus> = {
  pending: 'confirmed',
  confirmed: 'ready',
  ready: 'delivered',
}

export default function InquiryActions({
  inquiry,
  confirmLink,
  templates,
  fallbackLinkUrl,
}: {
  inquiry: Inquiry & { payment_status?: string }
  confirmLink: string
  templates?: WhatsAppTemplates
  fallbackLinkUrl?: string
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

  const waAction = pickWhatsAppAction(
    {
      customer_name: inquiry.customer_name,
      customer_phone: inquiry.customer_phone,
      fully_paid: inquiry.fully_paid,
      amount_paid: inquiry.amount_paid,
      customer_confirmed: inquiry.customer_confirmed,
      status: inquiry.status,
      admin_price: inquiry.admin_price,
      discount: inquiry.discount,
      confirmationLinkUrl: confirmLink,
      fallbackLinkUrl,
    },
    templates
  )

  const handleCopyLink = async () => {
    if (!waAction.linkUrl) return
    await navigator.clipboard.writeText(waAction.linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

        {/* Single status-driven WhatsApp action: confirmation, balance due, or order ready — never more than one */}
        {waAction.kind !== 'plain' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <WhatsAppButton variant="pill" action={waAction} customer_phone={inquiry.customer_phone} />
            </div>
            {waAction.linkUrl && (
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
            )}
          </div>
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
