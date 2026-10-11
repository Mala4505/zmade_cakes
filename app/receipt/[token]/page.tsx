import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { A4PaymentReceipt } from '@/components/receipt/A4PaymentReceipt'
import { ThermalReceiptContent } from '@/components/receipt/ThermalReceiptContent'
import { Navbar } from '@/components/public/Navbar'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { filenameDate } from '@/lib/utils'
import { PrintButton } from '@/app/invoice/[token]/_components/PrintButton'
import { DownloadPaymentReceiptButton } from './_components/DownloadPaymentReceiptButton'
import { ReceiptReveal } from './_components/ReceiptReveal'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Payment Receipt' }

export default async function PaymentReceiptPage({ params }: Props) {
  const { token } = await params

  const supabase = createServiceClient()
  const [{ data: payment, error }, { businessPhone, businessInstagram }] = await Promise.all([
    supabase
      .from('payments')
      .select('*, order:orders(*, inquiry:inquiries(*, delivery_address:delivery_addresses(*), items:inquiry_items(*)))')
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

  const customerSlug =
    String(inquiry.customer_name ?? '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ||
    'customer'
  const shareFileName = `zmade-receipt-${filenameDate(new Date(p.paid_at))}_${customerSlug}`

  return (
    <main
      className="invoice-page-bg flex-1"
      style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-surface-raised) 100%)' }}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          .invoice-page-bg { background: #fff !important; }
        }
      `}</style>

      <Navbar businessPhone={businessPhone} businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6 print:max-w-none print:p-0 print:gap-0">
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

        {/* Receipt — bill style on screen (prints out on first view); the saved image
            and the PDF use the formal layout */}
        <ReceiptReveal
          receiptToken={p.receipt_token}
          shareFileName={shareFileName}
          shareContent={
            <A4PaymentReceipt
              payment={p}
              order={frozenOrder}
              inquiry={frozenInquiry}
              businessPhone={businessPhone}
              businessInstagram={businessInstagram}
            />
          }
        >
          <ThermalReceiptContent
            payment={p}
            order={frozenOrder}
            inquiry={frozenInquiry}
            businessPhone={businessPhone}
            businessInstagram={businessInstagram}
          />
        </ReceiptReveal>
      </div>
    </main>
  )
}
