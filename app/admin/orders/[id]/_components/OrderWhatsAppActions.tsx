'use client'

import { WhatsappLogo } from '@phosphor-icons/react'
import type { WhatsAppTemplates } from '@/lib/supabase/types'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'
import { trackingLink } from '@/lib/utils'
import { interpolate, whatsappUrl, pickWhatsAppAction } from '@/lib/whatsapp'
import WhatsAppButton from '@/components/admin/WhatsAppButton'

export default function OrderWhatsAppActions({
  order,
  inquiry,
  templates,
  myOrdersUrl,
}: {
  order: {
    final_price: number | string
    amount_paid: string | number | null
    tracking_token: string
  }
  inquiry: {
    customer_name: string
    customer_phone: string
    fully_paid: boolean
  }
  templates?: WhatsAppTemplates
  myOrdersUrl?: string | null
}) {
  const firstName = inquiry.customer_name.split(' ')[0]
  const trackLink = trackingLink(order.tracking_token)
  const waAction = pickWhatsAppAction(
    {
      customer_name: inquiry.customer_name,
      customer_phone: inquiry.customer_phone,
      fully_paid: inquiry.fully_paid,
      amount_paid: order.amount_paid,
      final_price: order.final_price,
      fallbackLinkUrl: trackLink,
    },
    templates
  )

  return (
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

      {/* Single status-driven WhatsApp action: balance due (if outstanding) or order ready — never both */}
      <WhatsAppButton variant="pill" action={waAction} customer_phone={inquiry.customer_phone} />

      {/* Send Tracking Link */}
      <a
        href={whatsappUrl(
          inquiry.customer_phone,
          interpolate(templates?.trackingLink ?? DEFAULT_WHATSAPP_TEMPLATES.trackingLink, {
            name: firstName,
            link: trackLink,
          })
        )}
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
        Send Tracking Link
      </a>

      {/* Send My Orders portal link — bookmarkable, no password, shows all past orders */}
      {myOrdersUrl && (
        <a
          href={whatsappUrl(
            inquiry.customer_phone,
            interpolate(templates?.myOrdersLink ?? DEFAULT_WHATSAPP_TEMPLATES.myOrdersLink, {
              name: firstName,
              link: myOrdersUrl,
            })
          )}
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
          Send My Orders Link
        </a>
      )}
    </div>
  )
}
