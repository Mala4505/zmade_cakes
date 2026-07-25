import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInquiryImages } from '@/lib/actions/images'
import { getSettings } from '@/lib/actions/settings'
import { formatDate, formatTime, formatKWD, trackingLink, myOrdersLink, orderSummary, GOVERNORATE_LABELS } from '@/lib/utils'
import { generatePortalToken } from '@/lib/portal'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'
import OrderDetailActions from './_components/OrderDetailActions'
import OrderEtaSection from './_components/OrderEtaSection'
import OrderImageSection from './_components/OrderImageSection'
import OrderWhatsAppActions from './_components/OrderWhatsAppActions'
import InvoicePrint from '@/components/admin/InvoicePrint'
import type { Metadata } from 'next'
import type { OrderStatus, WhatsAppTemplates } from '@/lib/supabase/types'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('inquiry:inquiries(customer_name, order_type, item_name, cake_size, flavor)')
    .eq('id', id)
    .single()
  const inq = data?.inquiry as any
  const name = inq?.customer_name
  return { title: name ? `${name} — Order (${orderSummary(inq)})` : 'Order' }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: order, error }, settingsResult] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *, inquiry:inquiries (
          *, delivery_address:delivery_addresses(*)
        )
      `)
      .eq('id', id)
      .single(),
    getSettings(['business_phone', 'business_instagram', 'whatsapp_templates']),
  ])

  if (error || !order) notFound()
  if (settingsResult.error) throw new Error(`Order: failed to load settings — ${settingsResult.error}`)

  const inq = (order as any).inquiry
  const trackLink = trackingLink(order.tracking_token)
  const myOrdersUrl = inq?.customer_id ? myOrdersLink(generatePortalToken(inq.customer_id)) : null
  const businessPhone = (settingsResult.data?.business_phone as string) ?? ''
  const businessInstagram = (settingsResult.data?.business_instagram as string) ?? ''
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined

  const imagesResult = inq?.id ? await getInquiryImages(inq.id) : { data: [], error: null }
  if (imagesResult.error) throw new Error(`Order: failed to load images — ${imagesResult.error}`)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <div className="no-print">
        <PageHeader
          title={inq?.customer_name ?? 'Order'}
          subtitle={`${inq ? orderSummary(inq) : '—'} · ${inq?.event_date ? formatDate(inq.event_date) : '—'}`}
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
          <Detail label="Cake" value={inq ? orderSummary(inq) : undefined} />
          {inq?.occasion && <Detail label="Occasion" value={inq.occasion} />}
          {inq?.theme && <Detail label="Theme" value={inq.theme} />}
          {inq?.decoration_style && <Detail label="Decoration" value={inq.decoration_style} />}
          {inq?.message_on_cake && <Detail label="Message" value={inq.message_on_cake} />}
          <Detail label="Quantity" value={String(inq?.quantity ?? 1)} mono />
          <Detail label="Final Price" value={formatKWD(order.final_price?.toString())} mono />
          <Detail label="Security Deposit (KD)" value={order.deposit_amount ? formatKWD(order.deposit_amount.toString()) : '—'} mono />
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
              {inq.delivery_address.location_link && (
                <a
                  href={inq.delivery_address.location_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-teal)' }}
                >
                  View map pin →
                </a>
              )}
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
        {inq && (
          <div className="mb-6">
            <OrderWhatsAppActions
              order={{ final_price: order.final_price, amount_paid: order.amount_paid, tracking_token: order.tracking_token }}
              inquiry={{
                customer_name: inq.customer_name,
                customer_phone: inq.customer_phone,
                fully_paid: inq.fully_paid,
              }}
              templates={templates}
              myOrdersUrl={myOrdersUrl}
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
