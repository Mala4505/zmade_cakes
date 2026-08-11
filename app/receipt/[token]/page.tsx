import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import PaymentReceiptLayout from '@/components/PaymentReceiptLayout'
import { Navbar } from '@/components/public/Navbar'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { PrintButton } from '@/app/invoice/[token]/_components/PrintButton'
import { DownloadPaymentReceiptButton } from './_components/DownloadPaymentReceiptButton'
import { BRAND_NAME } from '@/lib/brand'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: `Payment Receipt — ${BRAND_NAME}` }

export default async function PaymentReceiptPage({ params }: Props) {
  const { token } = await params

  const supabase = createServiceClient()
  const [{ data: payment, error }, { businessPhone, businessInstagram }] = await Promise.all([
    supabase
      .from('payments')
      .select('*, order:orders(*, inquiry:inquiries(*, delivery_address:delivery_addresses(*)))')
      .eq('receipt_token', token)
      .single(),
    getBusinessContactSettings(),
  ])

  if (error || !payment) notFound()

  const p = payment as any
  const order = p.order
  const inquiry = order?.inquiry

  if (!order || !inquiry) notFound()

  // Freeze the "total paid / balance" numbers at the moment this payment landed, rather
  // than reading the order's live (trigger-derived) amount_paid. Without this, an old
  // partial payment's receipt would silently start saying "Fully Paid" the moment later
  // payments close out the order — a receipt should never change after it's issued.
  // fully_paid is derived from the cumulative sum reaching final_price as of this payment's
  // paid_at, not from the order's live (mutable, manually-toggled) fully_paid flag, since
  // that flag isn't timestamped and can't be reconstructed historically.
  const { data: priorPayments, error: priorError } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', order.id)
    .lte('paid_at', p.paid_at)
  if (priorError) throw new Error(`Receipt: failed to load payment history — ${priorError.message}`)

  const amountPaidThroughThisPayment = (priorPayments ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  )
  const frozenOrder = { ...order, amount_paid: amountPaidThroughThisPayment.toFixed(3) }
  const frozenInquiry = {
    ...inquiry,
    fully_paid: amountPaidThroughThisPayment >= Number(order.final_price),
  }

  return (
    <main
      className="invoice-page-bg min-h-svh"
      style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-surface-raised) 100%)' }}
    >
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          .no-print { display: none !important; }
          .invoice-page-bg { background: #fff !important; }
        }
      `}</style>

      <Navbar businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Print / download buttons */}
        <div className="no-print flex justify-end gap-2">
          <PrintButton label="Print Receipt" />
          <DownloadPaymentReceiptButton
            payment={p}
            order={frozenOrder}
            inquiry={frozenInquiry}
            businessPhone={businessPhone}
            businessInstagram={businessInstagram}
          />
        </div>

        {/* Receipt */}
        <PaymentReceiptLayout
          payment={p}
          order={frozenOrder}
          inquiry={frozenInquiry}
          businessPhone={businessPhone}
          businessInstagram={businessInstagram}
        />
      </div>
    </main>
  )
}
