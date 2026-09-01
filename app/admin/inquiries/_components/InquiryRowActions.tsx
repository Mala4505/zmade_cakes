'use client'

import { useRouter } from 'next/navigation'
import { CurrencyCircleDollar } from '@phosphor-icons/react'
import { setInquiryPaymentFlags } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { derivePaymentStatus, orderTotal } from '@/lib/payments'
import { confirmationLink } from '@/lib/utils'
import { pickWhatsAppAction } from '@/lib/whatsapp'
import WhatsAppButton from '@/components/admin/WhatsAppButton'
import { IconButton } from '@/components/ui'
import type { WhatsAppTemplates } from '@/lib/supabase/types'

interface RowInquiry {
  id: string
  customer_name: string
  customer_phone: string
  status: string
  customer_confirmed: boolean
  admin_price: string | null
  discount: string | null
  delivery_charge: string | null
  amount_paid: string | null
  fully_paid: boolean
  confirmation_token: string
}

export default function InquiryRowActions({
  inquiry,
  templates,
  fallbackLinkUrl,
}: {
  inquiry: RowInquiry
  templates?: WhatsAppTemplates
  fallbackLinkUrl?: string
}) {
  const router = useRouter()

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
      delivery_charge: inquiry.delivery_charge,
      confirmationLinkUrl: confirmationLink(inquiry.confirmation_token),
      fallbackLinkUrl,
    },
    templates
  )
  const paymentStatus = derivePaymentStatus(
    inquiry.amount_paid,
    orderTotal(inquiry.admin_price, inquiry.discount, inquiry.delivery_charge),
    inquiry.fully_paid
  )
  // `fully_paid` is the manual settle override (comped remainder / rounding write-off),
  // not "is paid" — the actual money is tracked in the payments ledger. The icon fills
  // when the order reads as paid (ledger-covered OR settled); the action toggles settle.
  const isSettled = inquiry.fully_paid
  const isPaid = paymentStatus === 'paid'

  const { run: toggleSettled, pending } = useAsyncAction(
    async () => {
      const result = await setInquiryPaymentFlags(inquiry.id, { fully_paid: !isSettled })
      if (result.error) return { error: result.error }
    },
    {
      successToast: isSettled ? 'Marked unsettled' : 'Marked settled',
      onSuccess: () => router.refresh(),
    }
  )

  const handleToggleSettled = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSettled()
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
      <WhatsAppButton variant="icon" action={waAction} customer_phone={inquiry.customer_phone} />
      <IconButton
        onClick={handleToggleSettled}
        loading={pending}
        title={isSettled ? 'Settled — click to unsettle' : 'Mark as settled (write off the balance)'}
        aria-label={isSettled ? 'Settled — click to unsettle' : 'Mark as settled'}
        style={{ color: isPaid ? 'var(--color-success)' : 'var(--color-ink-muted)' }}
      >
        <CurrencyCircleDollar size={20} weight={isPaid ? 'fill' : 'regular'} />
      </IconButton>
    </div>
  )
}
