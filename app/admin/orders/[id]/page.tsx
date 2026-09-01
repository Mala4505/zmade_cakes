import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInquiryImages } from '@/lib/actions/images'
import { getSettings } from '@/lib/actions/settings'
import { formatDate, formatTime, formatKWD, trackingLink, myOrdersLink, orderSummary, GOVERNORATE_LABELS } from '@/lib/utils'
import { generatePortalToken } from '@/lib/portal'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge, PaymentBadge } from '@/components/admin/StatusBadge'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import OrderDetailActions from './_components/OrderDetailActions'
import OrderEtaSection from './_components/OrderEtaSection'
import OrderImageSection from './_components/OrderImageSection'
import OrderWhatsAppActions from './_components/OrderWhatsAppActions'
import PaymentHistorySection from './_components/PaymentHistorySection'
import InvoicePrint from '@/components/admin/InvoicePrint'
import type { Metadata } from 'next'
import type { InquiryItem, OrderStatus, Payment, WhatsAppTemplates } from '@/lib/supabase/types'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('inquiry:inquiries(customer_name, items:inquiry_items(*))')
    .eq('id', id)
    .single()
  const inq = data?.inquiry as any
  const name = inq?.customer_name
  return { title: name ? `${name} — Order (${orderSummary(inq?.items ?? [])})` : 'Order' }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: order, error }, settingsResult] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *, inquiry:inquiries (
          *, delivery_address:delivery_addresses(*), items:inquiry_items(*)
        )
      `)
      .eq('id', id)
      .single(),
    getSettings(['business_phone', 'business_instagram', 'whatsapp_templates']),
  ])

  if (error || !order) notFound()
  if (settingsResult.error) throw new Error(`Order: failed to load settings — ${settingsResult.error}`)

  const inq = (order as any).inquiry

  // Payments are keyed to the inquiry (migration 037): fetching by inquiry_id
  // rather than order_id also catches any pre-confirmation orphan payments.
  const paymentsResult = inq?.id
    ? await supabase.from('payments').select('*').eq('inquiry_id', inq.id).order('paid_at', { ascending: false })
    : { data: [], error: null }
  if (paymentsResult.error) throw new Error(`Order: failed to load payments — ${paymentsResult.error.message}`)
  const trackLink = trackingLink(order.tracking_token)
  const myOrdersUrl = inq?.customer_id ? myOrdersLink(generatePortalToken(inq.customer_id)) : null
  const businessPhone = (settingsResult.data?.business_phone as string) ?? ''
  const businessInstagram = (settingsResult.data?.business_instagram as string) ?? ''
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined

  const imagesResult = inq?.id ? await getInquiryImages(inq.id) : { data: [], error: null }
  if (imagesResult.error) throw new Error(`Order: failed to load images — ${imagesResult.error}`)

  const payments = (paymentsResult.data ?? []) as unknown as Payment[]

  // Total / Paid / Balance — derived from the ledger, never a hand-typed field.
  // final_price is kept re-synced with admin_price/discount/delivery on edit (Phase 1.4).
  const orderTotalKwd = Number(order.final_price ?? 0)
  const amountPaidKwd = Number(inq?.amount_paid ?? 0)
  const settled = !!inq?.fully_paid
  const paymentStatus = derivePaymentStatus(amountPaidKwd, orderTotalKwd, settled)
  const balanceKwd = balanceOwed(orderTotalKwd, amountPaidKwd, settled)
  const paidPct = orderTotalKwd > 0 ? Math.min(100, Math.round((amountPaidKwd / orderTotalKwd) * 100)) : 0

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <div className="no-print">
        <PageHeader
          title={inq?.customer_name ?? 'Order'}
          subtitle={`${inq ? orderSummary(inq.items ?? []) : '—'} · ${inq?.event_date ? formatDate(inq.event_date) : '—'}`}
          backHref="/admin/orders"
          backLabel="Orders"
          action={<StatusBadge status={order.status as OrderStatus} />}
        />

        {/* Summary */}
        <div
          className="rounded-xl border p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <Detail label="Customer" value={inq?.customer_name} />
          <Detail label="Phone" value={inq?.customer_phone} mono />
          <Detail label="Event Date" value={inq?.event_date ? formatDate(inq.event_date) : '—'} mono />
          <Detail label="Pickup Time" value={formatTime(inq?.pickup_time)} mono />
          <Detail label="Cake" value={inq ? orderSummary(inq.items ?? []) : undefined} />
          {inq?.decoration_style && <Detail label="Decoration" value={inq.decoration_style} />}

          <div className="sm:col-span-2">
            <div
              className="rounded-lg border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
            >
              <div className="px-3.5 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink-muted)' }}>Order total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                    {formatKWD(orderTotalKwd.toFixed(3))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink-muted)' }}>Paid</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                    {formatKWD(amountPaidKwd.toFixed(3))}
                  </span>
                </div>
                <div
                  className="pt-1.5 mt-0.5 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: 'var(--color-border-strong)' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                    {settled ? 'Settled' : 'Balance'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {formatKWD(balanceKwd.toFixed(3))}
                    </span>
                    <PaymentBadge status={paymentStatus} />
                  </span>
                </div>
                {orderTotalKwd > 0 && (
                  <div
                    className="mt-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${paymentStatus === 'paid' ? 100 : paidPct}%`,
                        backgroundColor: 'var(--color-teal)',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {order.delivery_type === 'delivery' && Number(order.delivery_charge) > 0 && (
            <Detail label="Delivery Charge (KD)" value={formatKWD(order.delivery_charge?.toString())} mono />
          )}
          <Detail label="Security Deposit (KD)" value={order.deposit_amount ? formatKWD(order.deposit_amount.toString()) : '—'} mono />
          <Detail label="Payment" value={inq?.payment_method || '—'} />
          <Detail label="Delivery" value={order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} />
          {order.delivery_type === 'delivery' && inq?.delivery_address && (
            <div className="sm:col-span-2">
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
        </div>

        {/* Items */}
        {inq?.items && inq.items.length > 0 && (
          <div
            className="rounded-xl border p-4 mb-6 flex flex-col gap-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
              {inq.items.length > 1 ? `Items (${inq.items.length})` : 'Item Details'}
            </p>
            {(inq.items as InquiryItem[]).map((item, i) => (
              <div
                key={item.id}
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3"
                style={i > 0 ? { paddingTop: '1rem', borderTop: '1px solid var(--color-border)' } : undefined}
              >
                <div className="sm:col-span-2">
                  <Detail label={inq.items!.length > 1 ? `Item ${i + 1}` : 'Cake'} value={orderSummary([item])} />
                </div>
                {item.occasion && <Detail label="Occasion" value={item.occasion} />}
                {item.theme && <Detail label="Theme" value={item.theme} />}
                {item.message_on_cake && <Detail label="Message" value={item.message_on_cake} />}
                <Detail label="Quantity" value={String(item.quantity ?? 1)} mono />
                {item.special_requirements && (
                  <div className="sm:col-span-2">
                    <Detail label="Special Requirements" value={item.special_requirements} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payments */}
        <div className="mb-6">
          <PaymentHistorySection
            inquiryId={inq.id}
            orderId={order.id}
            payments={payments}
            orderTotal={orderTotalKwd}
            amountPaid={amountPaidKwd}
            customerName={inq?.customer_name ?? ''}
            customerPhone={inq?.customer_phone ?? ''}
            defaultMethod={inq?.payment_method || 'cash'}
          />
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
