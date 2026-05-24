import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { isValidUUID, formatDate, formatTime, formatKWD } from '@/lib/utils'
import type { Metadata } from 'next'
import type { OrderStatus } from '@/lib/supabase/types'
import { CheckCircle, Circle } from '@phosphor-icons/react/dist/ssr'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Track Your Order — ZMade Cakes' }

const STEPS: { status: OrderStatus; label: string; sublabel: string }[] = [
  { status: 'confirmed', label: 'Order Confirmed', sublabel: 'Your order is in Zainab\'s hands' },
  { status: 'in_progress', label: 'Being Made', sublabel: 'Zainab is in her kitchen creating something special for you' },
  { status: 'ready', label: 'Ready', sublabel: 'Your cake is ready — please arrange pickup or await delivery' },
  { status: 'delivered', label: 'Delivered', sublabel: 'Enjoy every bite. Thank you for choosing ZMade' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  confirmed: 0,
  in_progress: 1,
  ready: 2,
  delivered: 3,
  cancelled: -1,
}

export default async function TrackPage({ params }: Props) {
  const { token } = await params

  if (!isValidUUID(token)) notFound()

  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, inquiry:inquiries(*, delivery_address:delivery_addresses(*))')
    .eq('tracking_token', token)
    .single()

  if (error || !order) notFound()

  const o = order as any
  const inq = o.inquiry
  const currentStep = STATUS_ORDER[o.status as OrderStatus] ?? -1
  const isCancelled = o.status === 'cancelled'

  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      {/* Header */}
      <header className="border-b px-5 py-5 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
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
                This order has been cancelled. If you have questions or would like to rebook, Zainab is just a message away.
              </p>
              <a
                href={`https://wa.me/96566857560`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                Message Zainab on WhatsApp
              </a>
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

            <div className="flex flex-col gap-0">
              {STEPS.map((step, i) => {
                const isDone = currentStep > i
                const isCurrent = currentStep === i
                const isUpcoming = currentStep < i

                return (
                  <div key={step.status} className="flex gap-4">
                    {/* Connector column */}
                    <div className="flex flex-col items-center">
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
                      {i < STEPS.length - 1 && (
                        <div
                          className="w-0.5 flex-1 my-1"
                          style={{
                            backgroundColor: isDone
                              ? 'var(--color-teal)'
                              : 'var(--color-border)',
                            minHeight: '24px',
                          }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <div className={`pb-${i < STEPS.length - 1 ? '0' : '0'} pt-0.5`} style={{ paddingBottom: i < STEPS.length - 1 ? '24px' : '0' }}>
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
                        {isCurrent && (
                          <span
                            className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-teal-light)',
                              color: 'var(--color-teal-deep)',
                            }}
                          >
                            Now
                          </span>
                        )}
                      </p>
                      {(isCurrent || isDone) && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
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

        {/* Order details */}
        <section
          className="rounded-2xl border p-5 flex flex-col gap-2.5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Order Details
          </h2>

          <TrackRow label="Cake" value={`${inq?.cake_size} · ${inq?.flavor}`} />
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

        {/* Contact */}
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Questions about your order?
          </p>
          <a
            href="https://wa.me/96566857560"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            Message Zainab on WhatsApp
          </a>
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Instagram:{' '}
            <span style={{ color: 'var(--color-teal)' }}>@zmadecakes.q8</span>
          </p>
        </div>
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
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs pt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{
          color: 'var(--color-ink-secondary)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}
