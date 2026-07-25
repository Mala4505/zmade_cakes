import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { isValidUUID, formatDate, formatTime, formatKWD, formatAddress, orderSummary } from '@/lib/utils'
import ConfirmForm from './_components/ConfirmForm'
import CustomerPhotoUpload from './_components/CustomerPhotoUpload'
import { Navbar } from '@/components/public/Navbar'
import { BRAND_NAME } from '@/lib/brand'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: `Confirm Your Order — ${BRAND_NAME}` }

export default async function ConfirmPage({ params }: Props) {
  const { token } = await params

  if (!isValidUUID(token)) notFound()

  const supabase = createServiceClient()

  const [{ data: rawInquiry, error }, { data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('*, delivery_address:delivery_addresses(*)')
      .eq('confirmation_token', token)
      .single(),
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  if (error || !rawInquiry) notFound()

  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''
  const waNumber = businessPhone
    ? businessPhone.replace(/\D/g, '').replace(/^(?!965)/, '965')
    : ''

  const inquiry = rawInquiry as any

  if (inquiry.status === 'cancelled') {
    return <StatusPage title="Order Cancelled" message="This order has been cancelled. Please contact us for details." />
  }

  if (inquiry.customer_confirmed) {
    const { data: order } = await supabase
      .from('orders')
      .select('tracking_token')
      .eq('inquiry_id', inquiry.id)
      .single()
    const orderData = order as any
    if (orderData?.tracking_token) redirect(`/track/${orderData.tracking_token}`)
    return <StatusPage title="Already Confirmed" message="Your order has been confirmed. You'll receive a tracking link from us." />
  }

  const addr = inquiry.delivery_address ?? null

  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <Navbar businessInstagram={businessInstagram} />

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
        {/* 3-step progress */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <span className="font-medium" style={{ color: 'var(--color-teal)' }}>Review</span>
          <span style={{ color: 'var(--color-border)' }}>—</span>
          <span style={{ color: 'var(--color-ink-muted)' }}>Confirm</span>
          <span style={{ color: 'var(--color-border)' }}>—</span>
          <span style={{ color: 'var(--color-ink-muted)' }}>Track</span>
        </div>

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
            Review the details below — this is exactly what we've noted for your order. Confirm when you're happy, or message us directly if anything needs changing.
          </p>
        </div>

        {/* Order Summary */}
        <section
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {/* Highlighted header — the cake itself and every selection made for it */}
          <div className="p-5" style={{ backgroundColor: 'var(--color-teal-light)' }}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-teal-deep)' }}
            >
              Your Bespoke Order
            </h2>
            <p
              className="text-2xl font-bold leading-tight mt-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {orderSummary(inquiry)}
              {inquiry.quantity > 1 && (
                <span className="text-lg font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                  {' '}× {inquiry.quantity}
                </span>
              )}
            </p>
            {(inquiry.occasion || inquiry.theme || inquiry.decoration_style) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {inquiry.occasion && <SelectionPill label={inquiry.occasion} />}
                {inquiry.theme && <SelectionPill label={inquiry.theme} />}
                {inquiry.decoration_style && <SelectionPill label={inquiry.decoration_style} />}
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col gap-2.5">
            <SummaryRow label="Event Date" value={formatDate(inquiry.event_date)} mono />
            {inquiry.pickup_time && (
              <SummaryRow label="Time" value={formatTime(inquiry.pickup_time)} mono />
            )}
            <SummaryRow
              label="Delivery"
              value={inquiry.delivery_type === 'delivery' ? 'Delivery to your address' : 'Pickup from us'}
            />
            {inquiry.delivery_type === 'delivery' && addr && (
              <SummaryRow label="Address" value={formatAddress(addr)} />
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
                {inquiry.deposit_amount && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                    Security Deposit: {formatKWD(inquiry.deposit_amount)}
                    {inquiry.payment_method === 'wamd' ? ' via WAMD' : ' cash'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Allergen Requirements */}
        {(inquiry.allergen_nut_free || inquiry.allergen_dairy_free || inquiry.allergen_egg_free || inquiry.allergen_raw_sugar || inquiry.allergen_other) && (
          <section
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-danger)' }}>
              Dietary Requirements
            </p>
            <div className="flex flex-wrap gap-2">
              {inquiry.allergen_nut_free && <AllergenPill label="Nut-free" />}
              {inquiry.allergen_dairy_free && <AllergenPill label="Dairy-free" />}
              {inquiry.allergen_egg_free && <AllergenPill label="Egg-free" />}
              {inquiry.allergen_raw_sugar && <AllergenPill label="Raw sugar" />}
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
              These requirements will be confirmed with us before your cake is prepared.
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
      <footer className="text-center py-6 px-4 flex flex-col items-center gap-3">
        <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          Need to make a change? Message us on WhatsApp before confirming.
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--color-teal)' }}
          >
            Message us →
          </a>
        )}
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

function SelectionPill({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-medium px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-teal-deep)',
        border: '1px solid var(--color-teal)',
      }}
    >
      {label}
    </span>
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
