'use client'

import { useState } from 'react'
import { WhatsappLogo, LinkSimple, Copy, Check } from '@phosphor-icons/react'
import { buildReceiptAction, whatsappUrl } from '@/lib/whatsapp'
import { receiptLink } from '@/lib/links'
import type { WhatsAppTemplates } from '@/lib/supabase/types'

export interface ReceiptSendButtonsProps {
  customerName: string
  customerPhone: string
  amount: number | string // THIS payment's amount
  amountPaid: number | string // cumulative paid to date, through this payment
  orderTotal: number | string
  receiptToken: string
  templates?: WhatsAppTemplates
  /** true = dense icon-only row for PaymentHistorySection; false/omitted = the sheet's success step (full pill + label) */
  compact?: boolean
}

// WhatsApp brand green — matches WhatsAppButton.tsx's icon-color convention for
// the same action elsewhere in the admin.
const WHATSAPP_GREEN = '#25D366'

export default function ReceiptSendButtons({
  customerName,
  customerPhone,
  amount,
  amountPaid,
  orderTotal,
  receiptToken,
  templates,
  compact = false,
}: ReceiptSendButtonsProps) {
  const [copied, setCopied] = useState(false)

  const receiptUrl = receiptLink(receiptToken)
  const { text: receiptText } = buildReceiptAction(
    {
      customer_name: customerName,
      amount,
      amount_paid: amountPaid,
      order_total: orderTotal,
      receiptLinkUrl: receiptUrl,
    },
    templates
  )

  const sendReceiptHref = whatsappUrl(customerPhone, receiptText)
  // Deliberately the bare link as the message body — the owner's "just the
  // link, no message" option — not whatsappUrlNoText (which opens the chat
  // with an empty composer instead of a pre-filled link).
  const sendLinkHref = whatsappUrl(customerPhone, receiptUrl)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(receiptUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        <a
          href={sendReceiptHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Send receipt via WhatsApp"
          title="Send receipt via WhatsApp"
          className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all active:scale-[0.9] hover:opacity-70"
          style={{ color: WHATSAPP_GREEN }}
        >
          <WhatsappLogo size={15} weight="fill" />
        </a>
        <a
          href={sendLinkHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Send receipt link only"
          title="Send link only"
          className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all active:scale-[0.9] hover:opacity-70"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <LinkSimple size={15} />
        </a>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Receipt link copied' : 'Copy receipt link'}
          title={copied ? 'Copied' : 'Copy link'}
          className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all active:scale-[0.9] hover:opacity-70"
          style={{ color: copied ? 'var(--color-teal)' : 'var(--color-ink-muted)' }}
        >
          {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={sendReceiptHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
        style={{ backgroundColor: WHATSAPP_GREEN, color: '#fff' }}
      >
        <WhatsappLogo size={15} weight="fill" />
        Send Receipt
      </a>
      <div className="flex gap-2">
        <a
          href={sendLinkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.97]"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-raised)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          <LinkSimple size={14} />
          Send Link
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.97]"
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
    </div>
  )
}
