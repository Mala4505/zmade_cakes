import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InvoiceLayout from '@/components/InvoiceLayout'
import { PrintButton } from './_components/PrintButton'

interface Props { params: Promise<{ id: string }> }

export default async function AdminInvoicePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const [{ data: order, error }, { data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*), items:inquiry_items(*))')
      .eq('id', id)
      .single(),
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  if (error || !order) notFound()

  const o = order as any
  const inq = o.inquiry
  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''

  return (
    <div
      className="invoice-page-bg min-h-svh px-4 py-8"
      style={{ background: 'linear-gradient(180deg, var(--color-cream) 0%, var(--color-surface-raised) 100%)' }}
    >
      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          .no-print { display: none !important; }
          .invoice-page-bg { background: #fff !important; }
        }
      `}</style>

      <div className="no-print max-w-lg mx-auto mb-6 flex items-center justify-between">
        <Link
          href={`/admin/orders/${id}`}
          className="text-sm font-medium flex items-center gap-1.5"
          style={{ color: 'var(--color-ink-secondary)' }}
        >
          ← Back to Order
        </Link>
        <PrintButton />
      </div>

      <InvoiceLayout order={o} inquiry={inq} adminMode={true} businessPhone={businessPhone} businessInstagram={businessInstagram} invoiceNumber={o.invoice_number ?? null} />
    </div>
  )
}
