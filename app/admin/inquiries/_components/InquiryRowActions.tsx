'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WhatsappLogo, CurrencyCircleDollar, Spinner } from '@phosphor-icons/react'
import { setInquiryPaymentFlags } from '@/lib/actions/inquiries'
import { subtotalAfterDiscount, balanceOwed, derivePaymentStatus } from '@/lib/payments'
import { confirmationLink } from '@/lib/utils'
import { interpolate, whatsappUrl, whatsappUrlNoText } from '@/lib/whatsapp'
import { DEFAULT_WHATSAPP_TEMPLATES, type WhatsAppTemplates } from '@/lib/supabase/types'

interface RowInquiry {
  id: string
  customer_name: string
  customer_phone: string
  status: string
  customer_confirmed: boolean
  admin_price: string | null
  discount: string | null
  deposit_amount: string | null
  fully_paid: boolean
  confirmation_token: string
}

function pickWhatsAppAction(
  inq: RowInquiry,
  templates: WhatsAppTemplates | undefined
): { label: string; href: string } {
  const firstName = inq.customer_name.split(' ')[0]

  if (!inq.customer_confirmed) {
    if (inq.admin_price) {
      const link = confirmationLink(inq.confirmation_token)
      return {
        label: 'Send Confirmation',
        href: whatsappUrl(
          inq.customer_phone,
          interpolate(templates?.confirmationLink ?? DEFAULT_WHATSAPP_TEMPLATES.confirmationLink, {
            name: firstName,
            link,
          })
        ),
      }
    }
    return { label: 'Message Customer', href: whatsappUrlNoText(inq.customer_phone) }
  }

  const discounted = subtotalAfterDiscount(inq.admin_price, inq.discount)
  const balance = balanceOwed(discounted, inq.deposit_amount, inq.fully_paid)

  if (balance > 0) {
    return {
      label: `Balance Due — KD ${balance.toFixed(3)}`,
      href: whatsappUrl(
        inq.customer_phone,
        interpolate(templates?.balanceDue ?? DEFAULT_WHATSAPP_TEMPLATES.balanceDue, {
          name: firstName,
          amount: balance.toFixed(3),
        })
      ),
    }
  }

  if (inq.status === 'confirmed' || inq.status === 'ready') {
    return {
      label: 'Order Ready',
      href: whatsappUrl(
        inq.customer_phone,
        interpolate(templates?.orderReady ?? DEFAULT_WHATSAPP_TEMPLATES.orderReady, { name: firstName })
      ),
    }
  }

  return { label: 'Message Customer', href: whatsappUrlNoText(inq.customer_phone) }
}

export default function InquiryRowActions({
  inquiry,
  templates,
}: {
  inquiry: RowInquiry
  templates?: WhatsAppTemplates
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const waAction = pickWhatsAppAction(inquiry, templates)
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, inquiry.deposit_amount)
  const isPaid = paymentStatus === 'paid'

  const handleTogglePaid = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      const result = await setInquiryPaymentFlags(inquiry.id, { fully_paid: !isPaid })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isPaid ? 'Marked unpaid' : 'Marked fully paid')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
      <a
        href={waAction.href}
        target="_blank"
        rel="noopener noreferrer"
        title={waAction.label}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center w-7 h-7 transition-all active:scale-[0.9] hover:opacity-70"
        style={{ color: '#25D366' }}
      >
        <WhatsappLogo size={20} weight="fill" />
      </a>
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
