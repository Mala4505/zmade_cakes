import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { isValidToken, formatDate, formatTime, formatKWD, formatDateLong, orderSummary } from '@/lib/utils'
import { balanceOwed, derivePaymentStatus } from '@/lib/payments'
import { whatsappUrlNoText } from '@/lib/whatsapp'
import type { Metadata } from 'next'
import type { Order, OrderStatus, Payment, InquiryItem } from '@/lib/supabase/types'
import { CheckCircle, Circle, Receipt, ShieldCheck, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { BRAND_NAME } from '@/lib/brand'
import { Navbar } from '@/components/public/Navbar'
import { Button } from '@/components/ui/Button'
import { DetailRow } from '@/components/ui'
import { EditOrderModal } from './_components/EditOrderModal'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Track Your Order' }

const STEPS: { status: OrderStatus; label: string; sublabel: string }[] = [
  { status: 'confirmed', label: 'Order Confirmed', sublabel: 'Your order is with us' },
  { status: 'delivered', label: 'Delivered', sublabel: `Enjoy every bite. Thank you for choosing ${BRAND_NAME}` },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  confirmed: 0,
  delivered: 1,
  cancelled: -1,
}

export default async function TrackPage({ params }: Props) {
  const { token } = await params

  if (!isValidToken(token)) notFound()

  const supabase = createServiceClient()

  const [{ data: order, error }, { businessPhone, businessInstagram }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*), items:inquiry_items(*))')
      .eq('tracking_token', token)
      .single(),
    getBusinessContactSettings(),
  ])

  if (error || !order) notFound()

  const waUrl = businessPhone ? whatsappUrlNoText(businessPhone) : ''

  const o = order as unknown as Order
  const inq = o.inquiry
  // Backfilled by migration 034 for every pre-existing inquiry, and required (min 1) by
  // inquirySchema/publicInquirySchema for every new one — the flat-column fallback below only
  // guards against an unexpected data gap, not the common case.
  const items: InquiryItem[] = inq
    ? (inq.items && inq.items.length > 0
        ? [...inq.items].sort((a, b) => a.sort_order - b.sort_order)
        : [{
            id: inq.id,
            inquiry_id: inq.id,
            sort_order: 0,
            order_type: inq.order_type,
            item_name: inq.item_name,
            cake_size: inq.cake_size,
            flavor: inq.flavor,
            occasion: inq.occasion,
            theme: inq.theme,
            message_on_cake: inq.message_on_cake,
            quantity: inq.quantity,
            special_requirements: inq.special_requirements,
            created_at: inq.created_at,
          }])
    : []
  const currentStep = STATUS_ORDER[o.status as OrderStatus] ?? -1
  const isCancelled = o.status === 'cancelled'

  // Paid-in-full is derived from the payments ledger (amount vs order total), OR the admin's
  // manual settle override — `inq.fully_paid` alone no longer means "paid".
  const fullyPaid =
    derivePaymentStatus(o.amount_paid, o.final_price, Boolean(inq?.fully_paid)) === 'paid'
  const hasDiscount = Number(inq?.discount) > 0
  const hasDeliveryCharge = o.delivery_type === 'delivery' && Number(o.delivery_charge) > 0
  const amountPaid = Number(o.amount_paid ?? 0)
  const isPartiallyPaid = !fullyPaid && amountPaid !== 0
  const balance = balanceOwed(o.final_price, o.amount_paid, fullyPaid)
  const hasBalanceDue = !fullyPaid && balance > 0
  const hasSecurityDeposit = Number(o.deposit_amount ?? 0) !== 0

  let finishedImages: any[] = []
  if (o.status === 'delivered' && inq?.id) {
    const { data: images, error: imagesError } = await supabase
      .from('inquiry_images')
      .select('*')
      .eq('inquiry_id', inq.id)
      .eq('image_type', 'finished')
      .order('created_at', { ascending: true })
    if (imagesError) throw new Error(`Track: failed to load finished cake photos — ${imagesError.message}`)
    finishedImages = images ?? []
  }

  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', o.id)
    .order('paid_at', { ascending: false })
  if (paymentsError) throw new Error(`Track: failed to load payments — ${paymentsError.message}`)
  const payments = (paymentsData ?? []) as unknown as Payment[]

  return (
    <main
      className="flex-1"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <Navbar businessPhone={businessPhone} businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Greeting */}
        <div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            {isCancelled ? 'Order Cancelled' : (
              <>Your cake is<br />in good hands.</>
            )}
          </h1>
          {!isCancelled && (
            <p className="text-sm mt-2" style={{ color: 'var(--color-ink-muted)' }}>
              Hi {inq?.customer_name?.split(' ')[0]}, here's where your order stands.
            </p>
          )}
          {isCancelled && (
            <div className="mt-2">
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                This order has been cancelled. If you have questions or would like to rebook, we're just a message away.
              </p>
              {waUrl && (
                <Button
                  href={waUrl}
                  variant="primary"
                  size="md"
                  className="mt-4 px-5"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  Message us on WhatsApp
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Order Status
            </h2>

            <div className="flex flex-row items-start">
              {STEPS.map((step, i) => {
                const isDone = currentStep > i
                const isCurrent = currentStep === i
                const isUpcoming = currentStep < i
                // Connector "after" this step (between step i and i+1) is teal once
                // the order has moved past this step.
                const isPrevDone = i > 0 && currentStep > i - 1

                return (
                  <div key={step.status} className="flex-1 min-w-0 flex flex-col items-center">
                    {/* Circle + connector row */}
                    <div className="flex items-center w-full">
                      <div
                        className="flex-1 h-0.5"
                        style={{
                          backgroundColor: i === 0
                            ? 'transparent'
                            : isPrevDone
                            ? 'var(--color-border-strong)'
                            : 'var(--color-border)',
                        }}
                      />
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isCurrent
                            ? 'var(--color-teal)'
                            : isDone
                            ? 'var(--color-teal-light)'
                            : 'var(--color-surface-raised)',
                          border: `2px solid ${isCurrent ? 'var(--color-teal)' : isDone ? 'var(--color-teal-light)' : 'var(--color-border)'}`,
                        }}
                      >
                        {isDone ? (
                          <CheckCircle size={16} weight="fill" color="var(--color-teal-deep)" />
                        ) : isCurrent ? (
                          <Circle size={10} weight="fill" color="#fcf9f5" />
                        ) : (
                          <Circle size={10} weight="regular" color="var(--color-border-strong)" />
                        )}
                      </div>
                      <div
                        className="flex-1 h-0.5"
                        style={{
                          backgroundColor: i === STEPS.length - 1
                            ? 'transparent'
                            : isDone
                            ? 'var(--color-border-strong)'
                            : 'var(--color-border)',
                        }}
                      />
                    </div>

                    {/* Label */}
                    <div className="mt-2 px-1 flex flex-col items-center gap-1 text-center">
                      <p
                        className="text-sm font-semibold leading-tight"
                        style={{
                          color: isCurrent
                            ? 'var(--color-teal)'
                            : isUpcoming
                            ? 'var(--color-ink-muted)'
                            : 'var(--color-ink)',
                        }}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--color-teal-light)',
                            color: 'var(--color-teal-deep)',
                          }}
                        >
                          Now
                        </span>
                      )}
                      {isCurrent && (
                        <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                          {step.sublabel}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Your Cake — finished photos */}
        {finishedImages.length > 0 && (
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Your Cake
            </h2>
            <div className="flex flex-wrap gap-3">
              {finishedImages.map((img: any) => (
                <a
                  key={img.id}
                  href={img.url_original}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border"
                  style={{
                    borderColor: 'var(--color-border)',
                    width: 120,
                    height: 120,
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={img.url_medium}
                    alt="Finished cake photo"
                    width={120}
                    height={120}
                    sizes="120px"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Cake Care Guide — shown once the cake is out for pickup/delivery, so
            customers see storage/serving tips right when they need them. */}
        {o.status === 'delivered' && (
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Cake Care Guide
            </h2>
            <a
              href="/Guide.jpeg"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border"
              style={{
                borderColor: 'var(--color-border)',
                width: 160,
                height: 400,
                flexShrink: 0,
              }}
            >
              <Image
                src="/Guide.jpeg"
                alt="Cake Care Guide"
                width={160}
                height={400}
                sizes="160px"
                className="w-full h-full object-cover"
              />
            </a>
          </section>
        )}

        {/* ETA callout — kept neutral so the stepper's current-step circle
            stays the one teal moment on this screen. */}
        {o.eta_date ? (
          <div
            className="rounded-xl border px-4 py-4 flex flex-col gap-1"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              Expected by {formatDateLong(o.eta_date)}
              {o.eta_time ? `, ${formatTime(o.eta_time)}` : ''}
            </p>
            {o.eta_note && (
              <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                {o.eta_note}
              </p>
            )}
          </div>
        ) : (o.status !== 'cancelled' && o.status !== 'delivered') ? (
          <div
            className="rounded-xl px-5 py-4 text-sm"
            style={{
              border: '1.5px dashed var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-ink-muted)',
            }}
          >
            We'll share an expected date soon.
          </div>
        ) : null}

        {/* Order details */}
        <section
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Order Details
            </h2>
            {waUrl && inq && (
              <EditOrderModal
                businessPhone={businessPhone}
                cakeSummary={orderSummary(items)}
                eventDate={formatDate(inq.event_date)}
              />
            )}
          </div>

          {items.length <= 1 ? (
            <>
              <DetailRow label="Cake" value={items.length ? orderSummary(items) : '—'} />
              {items[0]?.theme && (
                <DetailRow label="Theme" value={items[0].theme} dir="auto" />
              )}
              {items[0]?.occasion && (
                <DetailRow label="Occasion" value={items[0].occasion} />
              )}
              {items[0]?.message_on_cake && (
                <DetailRow label="Message" value={`"${items[0].message_on_cake}"`} dir="auto" />
              )}
            </>
          ) : (
            // More than one item — a single flat Cake/Theme/Occasion/Message row can't
            // represent them all, so break each item out with its own mini-summary instead.
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                Items ({items.length})
              </span>
              {items.map((item, i) => (
                <div
                  key={item.id}
                  className={i > 0 ? 'flex flex-col gap-2 pt-3' : 'flex flex-col gap-2'}
                  style={i > 0 ? { borderTop: '1px dashed var(--color-border)' } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                      {orderSummary([item])}
                    </span>
                    {item.quantity > 1 && (
                      <span
                        className="text-xs font-medium shrink-0"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}
                      >
                        ×{item.quantity}
                      </span>
                    )}
                  </div>
                  {item.theme && <DetailRow label="Theme" value={item.theme} dir="auto" />}
                  {item.occasion && <DetailRow label="Occasion" value={item.occasion} />}
                  {item.message_on_cake && (
                    <DetailRow label="Message" value={`"${item.message_on_cake}"`} dir="auto" />
                  )}
                </div>
              ))}
            </div>
          )}
          <DetailRow label="Event Date" value={formatDate(inq?.event_date ?? '')} mono />
          {inq?.pickup_time && (
            <DetailRow label="Time" value={formatTime(inq.pickup_time)} mono />
          )}
          <DetailRow
            label="Delivery"
            value={o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
          />

          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '2px 0' }} />

          <DetailRow label="Subtotal" value={formatKWD(inq?.admin_price)} mono />
          {hasDiscount && (
            <DetailRow label="Discount" value={`- ${formatKWD(inq?.discount)}`} mono />
          )}
          {hasDeliveryCharge && (
            <DetailRow label="Delivery" value={`+ ${formatKWD(o.delivery_charge)}`} mono />
          )}
          <DetailRow label="Total" value={formatKWD(o.final_price)} mono emphasize />
          {isPartiallyPaid && (
            <DetailRow label="Amount Paid" value={formatKWD(o.amount_paid)} mono />
          )}
          {hasBalanceDue && (
            <DetailRow label="Balance Due" value={formatKWD(String(balance))} mono emphasize />
          )}
          {inq?.payment_method && (
            <DetailRow label="Payment" value={inq.payment_method === 'wamd' ? 'WAMD' : 'Cash'} />
          )}
        </section>

        {/* Payment History */}
        {payments.length > 0 && (
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Payment History
            </h2>
            <div className="flex flex-col">
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3"
                  style={i > 0 ? { borderTop: '1px dashed var(--color-border)' } : { paddingTop: 0 }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                    >
                      {formatKWD(p.amount)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                      {formatDate(p.paid_at)} · {p.method === 'wamd' ? 'WAMD' : 'Cash'}
                    </p>
                  </div>
                  <Link
                    href={`/receipt/${p.receipt_token}`}
                    className="inline-flex items-center gap-1 text-xs font-medium shrink-0 min-h-11 px-2 -mx-2 -my-2"
                    style={{ color: 'var(--color-teal)' }}
                  >
                    <Receipt size={13} weight="bold" />
                    View receipt
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Security Deposit — collateral, kept visually separate from the balance math above */}
        {hasSecurityDeposit && (
          <div
            className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} weight="bold" color="var(--color-ink-muted)" />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                  Security Deposit
                </p>
                <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  Held as collateral, separate from your order balance
                </p>
              </div>
            </div>
            <p
              className="text-sm font-semibold shrink-0"
              style={{ color: 'var(--color-ink-secondary)', fontFamily: 'var(--font-mono)' }}
            >
              {formatKWD(o.deposit_amount)}
            </p>
          </div>
        )}

        {/* Actions */}
        <Link
          href={`/invoice/${token}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
        >
          <Receipt size={15} weight="bold" />
          {fullyPaid ? 'View Receipt' : 'View Invoice'}
        </Link>
      </div>
    </main>
  )
}
