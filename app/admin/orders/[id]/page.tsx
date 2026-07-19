import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInquiryImages } from '@/lib/actions/images'
import { formatDate, formatTime, formatKWD, trackingLink, GOVERNORATE_LABELS } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import OrderDetailActions from './_components/OrderDetailActions'
import OrderEtaSection from './_components/OrderEtaSection'
import OrderImageSection from './_components/OrderImageSection'
import WhatsAppCopy from './_components/WhatsAppCopy'
import InvoicePrint from '@/components/admin/InvoicePrint'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/lib/supabase/types'

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

  const [{ data: order, error }, { data: phoneRow }, { data: igRow }, { data: templateSetting }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *, inquiry:inquiries (
          *, delivery_address:delivery_addresses(*)
        )
      `)
      .eq('id', id)
      .single(),
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
    supabase.from('business_settings').select('value').eq('key', 'whatsapp_templates').single(),
  ])

  if (error || !order) notFound()

  const inq = (order as any).inquiry
  const trackLink = trackingLink(order.tracking_token)
  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''
  const templates: string[] = Array.isArray(templateSetting?.value) ? (templateSetting.value as string[]) : []

  const imagesResult = inq?.id ? await getInquiryImages(inq.id) : { data: [], error: null }
  if (imagesResult.error) throw new Error(`Order: failed to load images — ${imagesResult.error}`)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <div className="no-print">
        <PageHeader
          title={inq?.customer_name ?? 'Order'}
          subtitle={`${inq?.cake_size} · ${inq?.flavor} · ${inq?.event_date ? formatDate(inq.event_date) : '—'}`}
          backHref="/admin/orders"
          backLabel="Orders"
          action={<StatusBadge status={order.status as OrderStatus} />}
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
          <Detail label="Final Price" value={formatKWD(order.final_price?.toString())} mono />
          <Detail label="Deposit amount (KD)" value={inq?.advance_amount ? formatKWD(inq.advance_amount) : '—'} mono />
          <Detail
            label="Deposit Status"
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

        {/* ETA */}
        <div className="mb-6">
          <OrderEtaSection
            orderId={order.id}
            initialDate={(order as any).eta_date ?? null}
            initialTime={(order as any).eta_time ?? null}
            initialNote={(order as any).eta_note ?? ''}
          />
        </div>

        {/* WhatsApp Templates */}
        {templates.length > 0 && (
          <div className="mb-6">
            <WhatsAppCopy
              templates={templates}
              customerName={inq?.customer_name ?? ''}
              trackingLink={trackLink}
              amount={order.final_price ? String(order.final_price) : ''}
            />
          </div>
        )}

        {/* Finished Cake Photos */}
        {inq?.id && (
          <div className="mb-6">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Finished Cake Photos
            </p>
            <OrderImageSection
              initialImages={imagesResult.data ?? []}
              inquiryId={inq.id}
            />
          </div>
        )}

        {/* Actions */}
        <OrderDetailActions
          order={order as any}
          trackingLink={trackLink}
          inquiry={{ customer_name: inq?.customer_name ?? '' }}
        />
      </div>

      {/* Invoice print component */}
      <InvoicePrint order={order as any} inquiry={inq} businessPhone={businessPhone} businessInstagram={businessInstagram} invoiceNumber={(order as any).invoice_number ?? null} />
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
