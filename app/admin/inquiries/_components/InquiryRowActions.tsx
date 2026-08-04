'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CurrencyCircleDollar, Spinner } from '@phosphor-icons/react'
import { setInquiryPaymentFlags } from '@/lib/actions/inquiries'
import { derivePaymentStatus } from '@/lib/payments'
import { confirmationLink } from '@/lib/utils'
import { pickWhatsAppAction } from '@/lib/whatsapp'
import WhatsAppButton from '@/components/admin/WhatsAppButton'
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
  const [pending, startTransition] = useTransition()

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

  const handleTogglePaid = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `pending` stuck
      // true forever with no feedback shown.
      try {
        const result = await setInquiryPaymentFlags(inquiry.id, { fully_paid: !isPaid })
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(isPaid ? 'Marked unpaid' : 'Marked fully paid')
          router.refresh()
        }
      } catch (err) {
        console.error('[InquiryRowActions] toggle paid failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
      <WhatsAppButton variant="icon" action={waAction} customer_phone={inquiry.customer_phone} />
      <button
        type="button"
        onClick={handleTogglePaid}
        disabled={pending}
        title={isPaid ? 'Fully paid — click to mark unpaid' : 'Mark as fully paid'}
        className="inline-flex items-center justify-center w-7 h-7 transition-all active:scale-[0.9] hover:opacity-70 disabled:opacity-50"
        style={{ color: isPaid ? 'var(--color-success)' : 'var(--color-ink-muted)' }}
      >
        {pending ? (
          <Spinner size={16} className="animate-spin" />
        ) : (
          <CurrencyCircleDollar size={20} weight={isPaid ? 'fill' : 'regular'} />
        )}
      </button>
    </div>
  )
}
