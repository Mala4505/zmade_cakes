'use client'

import { WhatsappLogo } from '@phosphor-icons/react'
import type { WhatsAppTemplates } from '@/lib/supabase/types'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'
import { balanceOwed } from '@/lib/payments'
import { trackingLink } from '@/lib/utils'
import { interpolate, whatsappUrl } from '@/lib/whatsapp'

export default function OrderWhatsAppActions({
  order,
  inquiry,
  templates,
  myOrdersUrl,
}: {
  order: {
    final_price: number | string
    deposit_amount: string | number | null
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
  const balance = balanceOwed(order.final_price, order.deposit_amount, inquiry.fully_paid)
  const hasOutstandingBalance = balance > 0

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

      {/* Order Ready — always shown for a confirmed order */}
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

      {/* Balance Due — only when the order's own frozen final_price still has a balance owing */}
      {hasOutstandingBalance && (
        <a
          href={whatsappUrl(
            inquiry.customer_phone,
            interpolate(templates?.balanceDue ?? DEFAULT_WHATSAPP_TEMPLATES.balanceDue, {
              name: firstName,
              amount: balance.toFixed(3),
            })
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
          style={{ backgroundColor: '#1a9e4c', color: '#fff' }}
        >
          <WhatsappLogo size={15} weight="fill" />
          Balance Due — KD {balance.toFixed(3)}
        </a>
      )}

      {/* Send Tracking Link */}
      <a
        href={whatsappUrl(
          inquiry.customer_phone,
          interpolate(templates?.trackingLink ?? DEFAULT_WHATSAPP_TEMPLATES.trackingLink, {
            name: firstName,
            link: trackingLink(order.tracking_token),
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
