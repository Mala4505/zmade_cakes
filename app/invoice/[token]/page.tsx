import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import InvoiceLayout from '@/components/InvoiceLayout'
import { PrintButton } from './_components/PrintButton'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Your Invoice — ZMade Cakes' }

export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params

  const supabase = createServiceClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*))')
    .eq('tracking_token', token)
    .single()

  if (error || !order) notFound()

  const o = order as any
  const inq = o.inquiry

  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <header
        className="border-b px-5 py-5 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-teal)' }}
        >
          ZMade Cakes
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          @zmadecakes.q8 · Kuwait
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Print button */}
        <div className="no-print flex justify-end">
          <PrintButton />
        </div>

        {/* Invoice */}
        <InvoiceLayout order={o} inquiry={inq} adminMode={false} />

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs mb-2" style={{ color: 'var(--color-ink-muted)' }}>
            Questions? Message Zainab on WhatsApp
          </p>
          <a
            href="https://wa.me/96566857560"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            Message on WhatsApp
          </a>
        </div>
      </div>
    </main>
  )
}
