'use client'

import { useRouter } from 'next/navigation'
import { CurrencyCircleDollar } from '@phosphor-icons/react'
import { setInquiryPaymentFlags } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { derivePaymentStatus } from '@/lib/payments'
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
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, inquiry.amount_paid)
  const isPaid = paymentStatus === 'paid'

  const { run: togglePaid, pending } = useAsyncAction(
    async () => {
      const result = await setInquiryPaymentFlags(inquiry.id, { fully_paid: !isPaid })
      if (result.error) return { error: result.error }
    },
    {
      successToast: isPaid ? 'Marked unpaid' : 'Marked fully paid',
      onSuccess: () => router.refresh(),
    }
  )

  const handleTogglePaid = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    togglePaid()
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
      <WhatsAppButton variant="icon" action={waAction} customer_phone={inquiry.customer_phone} />
      <IconButton
        onClick={handleTogglePaid}
        loading={pending}
        title={isPaid ? 'Fully paid — click to mark unpaid' : 'Mark as fully paid'}
        aria-label={isPaid ? 'Fully paid — click to mark unpaid' : 'Mark as fully paid'}
        style={{ color: isPaid ? 'var(--color-success)' : 'var(--color-ink-muted)' }}
      >
        <CurrencyCircleDollar size={20} weight={isPaid ? 'fill' : 'regular'} />
      </IconButton>
    </div>
  )
}
