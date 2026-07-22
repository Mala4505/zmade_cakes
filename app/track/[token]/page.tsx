import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { isValidUUID, formatDate, formatTime, formatKWD, formatDateLong, orderSummary } from '@/lib/utils'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/lib/supabase/types'
import { CheckCircle, Circle, PencilSimple, Receipt } from '@phosphor-icons/react/dist/ssr'
import { BRAND_NAME } from '@/lib/brand'
import { Navbar } from '@/components/public/Navbar'
import { whatsappUrl } from '@/lib/whatsapp'
import { Field, Input } from '@/components/ui'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: `Track Your Order — ${BRAND_NAME}` }

const STEPS: { status: OrderStatus; label: string; sublabel: string }[] = [
  { status: 'confirmed', label: 'Order Confirmed', sublabel: 'Your order is with us' },
  { status: 'ready', label: 'Ready', sublabel: 'Your cake is ready — please arrange pickup or await delivery' },
  { status: 'delivered', label: 'Delivered', sublabel: `Enjoy every bite. Thank you for choosing ${BRAND_NAME}` },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  confirmed: 0,
  ready: 1,
  delivered: 2,
  cancelled: -1,
}

export default async function TrackPage({ params }: Props) {
  const { token } = await params

  if (!isValidUUID(token)) notFound()

  const supabase = createServiceClient()

  const [{ data: order, error }, { data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*))')
      .eq('tracking_token', token)
      .single(),
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  if (error || !order) notFound()

  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''
  const waNumber = businessPhone
    ? businessPhone.replace(/\D/g, '').replace(/^(?!965)/, '965')
    : ''

  const o = order as any
  const inq = o.inquiry
  const currentStep = STATUS_ORDER[o.status as OrderStatus] ?? -1
  const isCancelled = o.status === 'cancelled'

  let finishedImages: any[] = []
  if ((o.status === 'ready' || o.status === 'delivered') && inq?.id) {
    const { data: images, error: imagesError } = await supabase
      .from('inquiry_images')
      .select('*')
      .eq('inquiry_id', inq.id)
      .eq('image_type', 'finished')
      .order('created_at', { ascending: true })
    if (imagesError) throw new Error(`Track: failed to load finished cake photos — ${imagesError.message}`)
    finishedImages = images ?? []
  }

  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <Navbar businessInstagram={businessInstagram} />

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
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#25D366', color: '#fff' }}
                >
                  Message us on WhatsApp
                </a>
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
                            ? 'var(--color-teal)'
                            : 'var(--color-border)',
                        }}
                      />
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isDone || isCurrent
                            ? 'var(--color-teal)'
                            : 'var(--color-surface-raised)',
                          border: `2px solid ${isDone || isCurrent ? 'var(--color-teal)' : 'var(--color-border)'}`,
                        }}
                      >
                        {isDone ? (
                          <CheckCircle size={16} weight="fill" color="#fcf9f5" />
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
                            ? 'var(--color-teal)'
                            : 'var(--color-border)',
                        }}
                      />
                    </div>

                    {/* Label */}
                    <div className="mt-2 px-1 flex flex-col items-center gap-1 text-center">
                      <p
                        className="text-sm font-semibold leading-tight"
                        title={isDone ? step.sublabel : undefined}
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
                  <img
                    src={img.url_medium}
                    alt="Finished cake photo"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ETA callout */}
        {o.eta_date ? (
          <div
            className="rounded-xl border px-4 py-4 flex flex-col gap-1"
            style={{ borderColor: 'var(--color-teal-light)', backgroundColor: 'var(--color-teal-light)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--color-teal-deep)' }}>
              Expected by {formatDateLong(o.eta_date)}
              {o.eta_time ? `, ${formatTime(o.eta_time)}` : ''}
            </p>
            {o.eta_note && (
              <p className="text-xs" style={{ color: 'var(--color-teal-deep)', opacity: 0.8 }}>
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
            {waNumber && inq && (
              <a
                href={whatsappUrl(
                  businessPhone,
                  `Hi, I'd like to update my order (${orderSummary(inq)}, ${formatDate(inq.event_date)})`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium shrink-0"
                style={{ color: 'var(--color-teal)' }}
              >
                <PencilSimple size={13} weight="bold" />
                Edit
              </a>
            )}
          </div>

          <TrackRow label="Cake" value={inq ? orderSummary(inq) : '—'} />
          {inq?.theme && inq.theme !== '' && (
            <TrackRow label="Theme" value={inq.theme} />
          )}
          {inq?.occasion && inq.occasion !== '' && (
            <TrackRow label="Occasion" value={inq.occasion} />
          )}
          {inq?.message_on_cake && inq.message_on_cake !== '' && (
            <TrackRow label="Message" value={`"${inq.message_on_cake}"`} />
          )}
          <TrackRow label="Event Date" value={formatDate(inq?.event_date)} mono />
          {inq?.pickup_time && (
            <TrackRow label="Time" value={formatTime(inq.pickup_time)} mono />
          )}
          <TrackRow
            label="Delivery"
            value={o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
          />
          <TrackRow label="Total" value={formatKWD(o.final_price)} mono />
          {inq?.payment_method && inq.payment_method !== '' && (
            <TrackRow label="Payment" value={inq.payment_method === 'wamd' ? 'WAMD' : 'Cash'} />
          )}
        </section>

        {/* Actions */}
        <Link
          href={`/invoice/${token}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
        >
          <Receipt size={15} weight="bold" />
          View Invoice
        </Link>
      </div>
    </main>
  )
}

function TrackRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <Field label={label}>
      <Input
        value={value}
        disabled
        readOnly
        style={{ fontFamily: mono ? 'var(--font-mono)' : undefined }}
      />
    </Field>
  )
}
