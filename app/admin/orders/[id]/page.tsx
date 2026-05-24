import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime, formatKWD, trackingLink, GOVERNORATE_LABELS } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import OrderDetailActions from './_components/OrderDetailActions'
import InvoicePrint from '@/components/admin/InvoicePrint'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('inquiry:inquiries(customer_name)')
    .eq('id', id)
    .single()
  const name = (data?.inquiry as any)?.customer_name
  return { title: name ? `${name} — Order` : 'Order' }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *, inquiry:inquiries (
        *, delivery_address:delivery_addresses(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  const inq = (order as any).inquiry
  const trackLink = trackingLink(order.tracking_token)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <div className="no-print">
        <PageHeader
          title={inq?.customer_name ?? 'Order'}
          subtitle={`${inq?.cake_size} · ${inq?.flavor} · ${inq?.event_date ? formatDate(inq.event_date) : '—'}`}
          backHref="/admin/orders"
          backLabel="Orders"
          action={<StatusBadge status={order.status} />}
        />

        {/* Summary */}
        <div
          className="rounded-xl border p-4 mb-6 grid grid-cols-2 gap-x-6 gap-y-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <Detail label="Customer" value={inq?.customer_name} />
          <Detail label="Phone" value={inq?.customer_phone} mono />
          <Detail label="Event Date" value={inq?.event_date ? formatDate(inq.event_date) : '—'} mono />
          <Detail label="Pickup Time" value={formatTime(inq?.pickup_time)} mono />
          <Detail label="Cake" value={`${inq?.cake_size} · ${inq?.flavor}`} />
          {inq?.occasion && <Detail label="Occasion" value={inq.occasion} />}
          {inq?.theme && <Detail label="Theme" value={inq.theme} />}
          {inq?.decoration_style && <Detail label="Decoration" value={inq.decoration_style} />}
          {inq?.message_on_cake && <Detail label="Message" value={inq.message_on_cake} />}
          <Detail label="Quantity" value={String(inq?.quantity ?? 1)} mono />
          <Detail label="Final Price" value={formatKWD(order.final_price)} mono />
          <Detail label="Advance" value={inq?.advance_amount ? formatKWD(inq.advance_amount) : '—'} mono />
          <Detail
            label="Advance Status"
            value={inq?.advance_paid ? 'Paid' : 'Unpaid'}
          />
          <Detail label="Payment" value={inq?.payment_method || '—'} />
          <Detail label="Delivery" value={order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} />
          {order.delivery_type === 'delivery' && inq?.delivery_address && (
            <div className="col-span-2">
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>Address</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
                {GOVERNORATE_LABELS[inq.delivery_address.governorate as keyof typeof GOVERNORATE_LABELS]},
                {' '}{inq.delivery_address.area},
                {' Block '}{inq.delivery_address.block},
                {' '}{inq.delivery_address.street},
                {' '}{inq.delivery_address.house_no}
              </p>
            </div>
          )}
          {inq?.special_requirements && (
            <div className="col-span-2">
              <Detail label="Special Requirements" value={inq.special_requirements} />
            </div>
          )}
        </div>

        {/* Actions */}
        <OrderDetailActions
          order={order as any}
          trackingLink={trackLink}
        />
      </div>

      {/* Invoice print component */}
      <InvoicePrint order={order as any} inquiry={inq} />
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
      <p
        className="text-sm"
        style={{
          color: 'var(--color-ink-secondary)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
        }}
      >
        {value || '—'}
      </p>
    </div>
  )
}
