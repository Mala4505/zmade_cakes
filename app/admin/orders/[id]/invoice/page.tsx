import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InvoiceLayout from '@/components/InvoiceLayout'
import { PrintButton } from './_components/PrintButton'

interface Props { params: Promise<{ id: string }> }

export default async function AdminInvoicePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*))')
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  const o = order as any
  const inq = o.inquiry

  return (
    <div
      className="min-h-svh px-4 py-8"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

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

      <InvoiceLayout order={o} inquiry={inq} adminMode={true} />
    </div>
  )
}
