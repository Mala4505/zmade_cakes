import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import InvoiceLayout from '@/components/InvoiceLayout'
import { Navbar } from '@/components/public/Navbar'
import { PrintButton } from './_components/PrintButton'
import { DownloadPdfButton } from './_components/DownloadPdfButton'
import { derivePaymentStatus } from '@/lib/payments'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Your Invoice' }

export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params

  const supabase = createServiceClient()
  const [{ data: order, error }, { data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*), items:inquiry_items(*))')
      .eq('tracking_token', token)
      .single(),
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  if (error || !order) notFound()

  const o = order as any
  const inq = o.inquiry
  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''
  const isPaid = derivePaymentStatus(o.amount_paid, o.final_price, inq?.fully_paid) === 'paid'

  return (
    <main
      className="invoice-page-bg flex-1"
      style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-surface-raised) 100%)' }}
    >
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          .no-print { display: none !important; }
          .invoice-page-bg { background: #fff !important; }
        }
      `}</style>

      <Navbar businessPhone={businessPhone} businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Print / download buttons */}
        <div className="no-print flex justify-end gap-2">
          <PrintButton />
          <DownloadPdfButton
            order={o}
            inquiry={inq}
            adminMode={false}
            businessPhone={businessPhone}
            businessInstagram={businessInstagram}
            invoiceNumber={o.invoice_number ?? null}
            fileLabel={isPaid ? 'receipt' : 'invoice'}
          />
        </div>

        {/* Invoice */}
        <InvoiceLayout order={o} inquiry={inq} adminMode={false} businessPhone={businessPhone} businessInstagram={businessInstagram} invoiceNumber={o.invoice_number ?? null} />
      </div>
    </main>
  )
}
