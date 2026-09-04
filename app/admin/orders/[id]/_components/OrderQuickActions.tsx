'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, CheckCircle, Copy, Spinner, WhatsappLogo } from '@phosphor-icons/react'
import { updateInquiryStatus } from '@/lib/actions/inquiries'
import { updateOrderStatus } from '@/lib/actions/orders'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { trackingLink } from '@/lib/utils'
import { interpolate, pickWhatsAppAction, whatsappUrl } from '@/lib/whatsapp'
import { IconButton } from '@/components/ui'
import WhatsAppButton from '@/components/admin/WhatsAppButton'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'
import type { InquiryStatus, OrderStatus, WhatsAppTemplates } from '@/lib/supabase/types'

interface Props {
  inquiry: {
    id: string
    customer_name: string
    customer_phone: string
    fully_paid: boolean
    amount_paid: string | number | null
    customer_confirmed?: boolean
    status: InquiryStatus
    admin_price?: string | number | null
    discount?: string | number | null
    delivery_charge?: string | number | null
  }
  order: {
    id: string
    status: OrderStatus
    final_price: string | number
    amount_paid: string | number | null
    tracking_token: string
  } | null
  confirmationLinkUrl: string
  myOrdersUrl?: string | null
  templates?: WhatsAppTemplates
}

/**
 * The single "what do I do next / how do I reach this customer" card —
 * replaces the old InquiryActions + OrderWhatsAppActions cards (which
 * duplicated each other once an order existed) and the tracking-link/copy
 * portion of OrderDetailActions. One status action, one WhatsApp message,
 * two icon-only link actions.
 */
export default function OrderQuickActions({
  inquiry,
  order,
  confirmationLinkUrl,
  myOrdersUrl,
  templates,
}: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const trackLink = order ? trackingLink(order.tracking_token) : null
  const copyTarget = trackLink ?? confirmationLinkUrl

  const waAction = order
    ? pickWhatsAppAction(
        {
          customer_name: inquiry.customer_name,
          customer_phone: inquiry.customer_phone,
          fully_paid: inquiry.fully_paid,
          amount_paid: order.amount_paid,
          final_price: order.final_price,
          fallbackLinkUrl: trackLink ?? undefined,
        },
        templates
      )
    : pickWhatsAppAction(
        {
          customer_name: inquiry.customer_name,
          customer_phone: inquiry.customer_phone,
          fully_paid: inquiry.fully_paid,
          amount_paid: inquiry.amount_paid,
          customer_confirmed: inquiry.customer_confirmed,
          status: inquiry.status,
          admin_price: inquiry.admin_price != null ? String(inquiry.admin_price) : null,
          discount: inquiry.discount != null ? String(inquiry.discount) : null,
          delivery_charge: inquiry.delivery_charge != null ? String(inquiry.delivery_charge) : null,
          confirmationLinkUrl,
          fallbackLinkUrl: myOrdersUrl ?? undefined,
        },
        templates
      )

  const nextStep = !order && inquiry.status === 'pending'
    ? { label: 'Mark as Confirmed', icon: CheckCircle }
    : order && order.status === 'confirmed'
    ? { label: 'Mark Delivered', icon: ArrowRight }
    : null

  const { run: advance, pending: advancing } = useAsyncAction(
    async () => {
      const result = order
        ? await updateOrderStatus(order.id, 'delivered')
        : await updateInquiryStatus(inquiry.id, 'confirmed')
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'Status updated',
      onSuccess: () => router.refresh(),
    }
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyTarget)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        Quick Actions
      </p>

      {nextStep && (
        <button
          type="button"
          onClick={() => advance()}
          disabled={advancing}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          {advancing ? <Spinner size={15} className="animate-spin" /> : <nextStep.icon size={15} />}
          {nextStep.label}
        </button>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <WhatsAppButton variant="pill" action={waAction} customer_phone={inquiry.customer_phone} />
        </div>
        <IconButton tone="muted" aria-label={copied ? 'Link copied' : 'Copy link'} title={copied ? 'Copied' : 'Copy link'} onClick={handleCopy}>
          {copied ? <Check size={16} weight="bold" style={{ color: 'var(--color-teal)' }} /> : <Copy size={16} />}
        </IconButton>
        {order && myOrdersUrl && (
          <a
            href={whatsappUrl(
              inquiry.customer_phone,
              interpolate(templates?.myOrdersLink ?? DEFAULT_WHATSAPP_TEMPLATES.myOrdersLink, {
                name: inquiry.customer_name.split(' ')[0],
                link: myOrdersUrl,
              })
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send My Orders link via WhatsApp"
            title="Send My Orders link"
            className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-lg transition-all active:scale-[0.94] hover:bg-[var(--color-surface-raised)]"
            style={{ color: '#25D366' }}
          >
            <WhatsappLogo size={16} weight="fill" />
          </a>
        )}
      </div>

      <p
        className="text-[11px] truncate"
        style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {copyTarget}
      </p>
    </div>
  )
}
