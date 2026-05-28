import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { isValidUUID, formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'
import ConfirmForm from './_components/ConfirmForm'
import CustomerPhotoUpload from './_components/CustomerPhotoUpload'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Confirm Your Order — ZMade Cakes' }

export default async function ConfirmPage({ params }: Props) {
  const { token } = await params

  if (!isValidUUID(token)) notFound()

  const supabase = createServiceClient()

  const { data: rawInquiry, error } = await supabase
    .from('inquiries')
    .select('*, delivery_address:delivery_addresses(*)')
    .eq('confirmation_token', token)
    .single()

  if (error || !rawInquiry) notFound()

  const inquiry = rawInquiry as any

  if (inquiry.status === 'cancelled') {
    return <StatusPage title="Order Cancelled" message="This order has been cancelled. Please contact Zainab for details." />
  }

  if (inquiry.customer_confirmed) {
    const { data: order } = await supabase
      .from('orders')
      .select('tracking_token')
      .eq('inquiry_id', inquiry.id)
      .single()
    const orderData = order as any
    if (orderData?.tracking_token) redirect(`/track/${orderData.tracking_token}`)
    return <StatusPage title="Already Confirmed" message="Your order has been confirmed. You'll receive a tracking link from Zainab." />
  }

  const addr = inquiry.delivery_address ?? null

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

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
        {/* Intro */}
        <div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            Hi {inquiry.customer_name.split(' ')[0]},
          </h1>
          <p className="text-lg font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-secondary)' }}>
            your bespoke cake is ready to confirm.
          </p>
          <p className="text-sm mt-3" style={{ color: 'var(--color-ink-muted)' }}>
            Review the details below — this is exactly what Zainab has noted for your order. Confirm when you're happy, or message her directly if anything needs changing.
          </p>
        </div>

        {/* Order Summary */}
        <section
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Your Bespoke Order
          </h2>

          <div className="pb-3 mb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {inquiry.cake_size} · {inquiry.flavor}
            </p>
            {inquiry.occasion && inquiry.occasion !== '' && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                {inquiry.occasion}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {inquiry.theme && inquiry.theme !== '' && (
              <SummaryRow label="Theme" value={inquiry.theme} />
            )}
            {inquiry.decoration_style && (
              <SummaryRow label="Decoration" value={inquiry.decoration_style} />
            )}
            <SummaryRow label="Quantity" value={String(inquiry.quantity)} mono />
            <SummaryRow label="Event Date" value={formatDate(inquiry.event_date)} mono />
            {inquiry.pickup_time && (
              <SummaryRow label="Time" value={formatTime(inquiry.pickup_time)} mono />
            )}
            <SummaryRow
              label="Delivery"
              value={inquiry.delivery_type === 'delivery' ? 'Delivery to your address' : 'Pickup from Zainab'}
            />
            {inquiry.delivery_type === 'delivery' && addr && (
              <SummaryRow
                label="Address"
                value={[
                  GOVERNORATE_LABELS[addr.governorate as keyof typeof GOVERNORATE_LABELS],
                  addr.area,
                  `Block ${addr.block}`,
                  addr.street,
                  addr.house_no,
                ].filter(Boolean).join(', ')}
              />
            )}
            {inquiry.admin_price && (
              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                    Total
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-teal)' }}
                  >
                    {formatKWD(inquiry.admin_price)}
                  </span>
                </div>
                {inquiry.advance_amount && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                    Advance: {formatKWD(inquiry.advance_amount)}
                    {inquiry.payment_method === 'wamd' ? ' via WAMD' : ' cash'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Allergen Requirements */}
        {(inquiry.allergen_nut_free || inquiry.allergen_gluten_free || inquiry.allergen_dairy_free || inquiry.allergen_egg_free || inquiry.allergen_halal || inquiry.allergen_other) && (
          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-danger)' }}>
              Dietary Requirements
            </p>
            <div className="flex flex-wrap gap-2">
              {inquiry.allergen_nut_free && <AllergenPill label="Nut-free" />}
              {inquiry.allergen_gluten_free && <AllergenPill label="Gluten-free" />}
              {inquiry.allergen_dairy_free && <AllergenPill label="Dairy-free" />}
              {inquiry.allergen_egg_free && <AllergenPill label="Egg-free" />}
              {inquiry.allergen_halal && <AllergenPill label="Halal-certified" />}
              {inquiry.allergen_other && (
                <span
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
                >
                  {inquiry.allergen_other}
                </span>
              )}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-danger)' }}>
              These requirements will be confirmed with Zainab before your cake is prepared.
            </p>
          </section>
        )}

        {/* Reference photo upload */}
        <CustomerPhotoUpload token={token} />

        {/* Confirmation form */}
        <ConfirmForm
          token={token}
          inquiryId={inquiry.id}
          deliveryType={inquiry.delivery_type}
          currentPickupTime={inquiry.pickup_time}
          currentMessageOnCake={inquiry.message_on_cake}
          currentSpecialRequirements={inquiry.special_requirements}
          existingAddress={addr}
        />
      </div>

      {/* Footer */}
      <footer className="text-center py-6 px-4">
        <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          Need to make a change? Message Zainab on WhatsApp before confirming.
        </p>
        <a
          href={`https://wa.me/96566857560`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--color-teal)' }}
        >
          Message Zainab →
        </a>
      </footer>
    </main>
  )
}

function SummaryRow({
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

function AllergenPill({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide"
      style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
    >
      {label}
    </span>
  )
}

function StatusPage({ title, message }: { title: string; message: string }) {
  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-5 text-center"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <p
        className="text-xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
      >
        {title}
      </p>
      <p className="text-sm max-w-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {message}
      </p>
    </main>
  )
}
