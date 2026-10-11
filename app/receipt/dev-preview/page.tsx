// TEMPORARY dev-only preview of the receipt page with fake data (before vs after).
// Delete this folder once the receipt redesign is approved.
import { notFound } from 'next/navigation'
import PaymentReceiptLayout from '@/components/PaymentReceiptLayout'
import { A4PaymentReceipt } from '@/components/receipt/A4PaymentReceipt'
import { ThermalReceiptContent } from '@/components/receipt/ThermalReceiptContent'
import { Navbar } from '@/components/public/Navbar'
import { PrintButton } from '@/app/invoice/[token]/_components/PrintButton'
import { DownloadPaymentReceiptButton } from '@/app/receipt/[token]/_components/DownloadPaymentReceiptButton'
import { ReceiptReveal } from '@/app/receipt/[token]/_components/ReceiptReveal'
import type { InquiryItem } from '@/lib/supabase/types'

interface Props { searchParams: Promise<{ v?: string; paid?: string; t?: string }> }

const item = (o: Partial<InquiryItem>): InquiryItem => ({
  id: crypto.randomUUID(), inquiry_id: 'demo', sort_order: 0, order_type: 'cake', item_name: '',
  cake_size: '', flavor: '', occasion: '', theme: '', message_on_cake: '', quantity: 1,
  special_requirements: '', created_at: '2026-10-01T10:00:00Z', ...o,
})

export default async function ReceiptPreviewPage({ searchParams }: Props) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { v = 'after', paid, t } = await searchParams
  const fullyPaid = paid === '1'
  const token = t ?? 'DEMO7Q2K9XPA'

  const payment = {
    amount: fullyPaid ? '17.500' : '10.000',
    method: 'wamd' as const,
    receipt_token: token,
    note: fullyPaid ? 'Balance cleared on delivery' : null,
    paid_at: '2026-10-08T14:30:00Z',
  }
  const order = { final_price: '27.500', amount_paid: fullyPaid ? '27.500' : '10.000' }
  const inquiry = {
    customer_name: 'Fatema Abdulhussain',
    customer_phone: '+965 9876 5432',
    items: [
      item({ cake_size: '8" Round (2 tier)', flavor: 'Pistachio rose with cardamom cream' }),
      item({ order_type: 'other_item', item_name: 'Cupcakes (box of 12)', cake_size: 'Mini', sort_order: 1 }),
    ],
    event_date: '2026-10-15',
    pickup_time: null,
    fully_paid: fullyPaid,
    invoice_number: 42,
  }
  const contact = { businessPhone: '+965 5000 1234', businessInstagram: '@zmade.kw' }
  const props = { payment, order, inquiry, ...contact }

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
      <Navbar {...contact} />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6 print:max-w-none print:p-0 print:gap-0">
        <div className="no-print flex justify-end gap-2">
          <PrintButton label="Print Receipt" />
          <DownloadPaymentReceiptButton {...props} />
        </div>
        {v === 'before' ? (
          <PaymentReceiptLayout {...props} />
        ) : (
          <ReceiptReveal
            receiptToken={token}
            shareFileName="zmade-receipt-2026-10-08_fatema-abdulhussain"
            shareContent={<A4PaymentReceipt {...props} />}
          >
            <ThermalReceiptContent {...props} />
          </ReceiptReveal>
        )}
      </div>
    </main>
  )
}
