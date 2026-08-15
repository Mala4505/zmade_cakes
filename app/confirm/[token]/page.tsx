import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { isValidToken, formatDate, formatTime, formatKWD, formatAddress, orderSummary } from '@/lib/utils'
import { orderTotal } from '@/lib/payments'
import ConfirmForm from './_components/ConfirmForm'
import CustomerPhotoUpload from './_components/CustomerPhotoUpload'
import { Navbar } from '@/components/public/Navbar'
import { DetailRow } from '@/components/ui'
import { Info } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import type { Inquiry, InquiryItem } from '@/lib/supabase/types'

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = { title: 'Confirm Your Order' }

export default async function ConfirmPage({ params }: Props) {
  const { token } = await params

  if (!isValidToken(token)) notFound()

  const supabase = createServiceClient()

  const [{ data: rawInquiry, error }, { businessPhone, businessInstagram }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('*, delivery_address:delivery_addresses(*), items:inquiry_items(*)')
      .eq('confirmation_token', token)
      .single(),
    getBusinessContactSettings(),
  ])

  if (error || !rawInquiry) notFound()

  // Reference photos already attached to this inquiry — added by the admin while
  // building the quote, or by the customer on the original /order form — so the
  // customer can see what's on file instead of the upload widget looking empty.
  const { data: referenceImages } = await supabase
    .from('inquiry_images')
    .select('id, url_thumb, uploaded_by')
    .eq('inquiry_id', rawInquiry.id)
    .eq('image_type', 'reference')
    .order('created_at', { ascending: true })

  const waNumber = businessPhone
    ? businessPhone.replace(/\D/g, '').replace(/^(?!965)/, '965')
    : ''

  const inquiry = rawInquiry as unknown as Inquiry

  // Backfilled by migration 034 for every pre-existing inquiry, and required (min 1) by
  // inquirySchema/publicInquirySchema for every new one — the empty-array fallback below only
  // guards against an unexpected data gap, not the common case.
  const items: InquiryItem[] = (inquiry.items ?? []).length > 0
    ? [...(inquiry.items as InquiryItem[])].sort((a, b) => a.sort_order - b.sort_order)
    : []
  const firstItem: InquiryItem | null = items[0] ?? null

  if (inquiry.status === 'cancelled') {
    return (
      <StatusPage
        title="Order Cancelled"
        message="This order has been cancelled. Please contact us for details."
        businessInstagram={businessInstagram}
        waNumber={waNumber}
      />
    )
  }

  // Anything past 'pending' has already moved beyond the confirm step — whether the
  // customer confirmed it themselves or the admin advanced/created it directly (e.g.
  // backdating a completed order for the record) — so send them to the tracking/receipt
  // view instead of asking them to confirm an order that's already confirmed, ready, or
  // delivered. Checking `status` here (not `customer_confirmed`) is what makes this work
  // for admin-driven status changes, which set status/create the order but intentionally
  // leave `customer_confirmed` false since the customer never actually confirmed it.
  if (inquiry.status !== 'pending') {
    const { data: order } = await supabase
      .from('orders')
      .select('tracking_token')
      .eq('inquiry_id', inquiry.id)
      .single()
    if (order?.tracking_token) redirect(`/track/${order.tracking_token}`)
    return (
      <StatusPage
        title="Already Confirmed"
        message="Your order has been confirmed. You'll receive a tracking link from us."
        businessInstagram={businessInstagram}
        waNumber={waNumber}
      />
    )
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
          <span className="font-medium" style={{ color: 'var(--color-ink)' }}>Review</span>
          <span style={{ color: 'var(--color-border)' }}>—</span>
          <span style={{ color: 'var(--color-ink-muted)' }}>Confirm</span>
          <span style={{ color: 'var(--color-border)' }}>—</span>
          <span style={{ color: 'var(--color-ink-muted)' }}>Track</span>
        </div>

        {/* Intro — cover band, matches the "Atelier Cover" treatment on /my-orders */}
        <div
          className="zm-cover-texture rounded-2xl px-5 py-6"
          style={{ backgroundColor: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-teal-deep)' }}>
            Review &amp; Confirm
          </p>
          <h1
            className="text-2xl font-bold leading-tight mt-1.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
          >
            Hi {inquiry.customer_name.split(' ')[0]},
          </h1>
          <p className="text-lg font-medium mt-0.5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-secondary)' }}>
            your bespoke cake is ready to confirm.
          </p>
          <p className="text-sm mt-2.5" style={{ color: 'var(--color-ink-muted)' }}>
            Review the details below — this is exactly what we&apos;ve noted for your order. Confirm when you&apos;re happy, or message us directly if anything needs changing.
          </p>
        </div>

        {/* Order Summary */}
        <section
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {/* Highlighted header — the cake itself and every selection made for it.
              Kept neutral so the Confirm Order button stays the one teal moment
              on this screen. */}
          <div className="p-5" style={{ backgroundColor: 'var(--color-surface-raised)' }}>
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Your Bespoke Order
            </h2>
            <p
              className="text-2xl font-bold leading-tight mt-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              {items.length > 0 ? orderSummary(items) : '—'}
              {items.length === 1 && firstItem && firstItem.quantity > 1 && (
                <span className="text-lg font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                  {' '}× {firstItem.quantity}
                </span>
              )}
            </p>

            {items.length <= 1 ? (
              (firstItem?.occasion || firstItem?.theme || inquiry.decoration_style) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {firstItem?.occasion && <SelectionPill label={firstItem.occasion} />}
                  {firstItem?.theme && <SelectionPill label={firstItem.theme} />}
                  {inquiry.decoration_style && <SelectionPill label={inquiry.decoration_style} />}
                </div>
              )
            ) : (
              // More than one item: the headline above already joins every item into one
              // string, so break each one out here instead of a single ambiguous pill row —
              // occasion/theme differ per item and can't be represented as one set of pills.
              <div className="flex flex-col gap-3 mt-4">
                {inquiry.decoration_style && (
                  <div className="flex flex-wrap gap-1.5">
                    <SelectionPill label={inquiry.decoration_style} />
                  </div>
                )}
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className={i > 0 ? 'pt-3' : undefined}
                    style={i > 0 ? { borderTop: '1px dashed var(--color-border)' } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                        {orderSummary([item])}
                      </p>
                      {item.quantity > 1 && (
                        <span
                          className="text-xs font-medium shrink-0"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}
                        >
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                    {(item.occasion || item.theme) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.occasion && <SelectionPill label={item.occasion} />}
                        {item.theme && <SelectionPill label={item.theme} />}
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  You can edit your first cake&apos;s message and special requirements below. To change anything about the other items, message us directly.
                </p>
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col gap-2.5">
            <DetailRow label="Event Date" value={formatDate(inquiry.event_date)} mono />
            {inquiry.pickup_time && (
              <DetailRow label="Time" value={formatTime(inquiry.pickup_time)} mono />
            )}
            <DetailRow
              label="Delivery"
              value={inquiry.delivery_type === 'delivery' ? 'Delivery to your address' : 'Pickup from us'}
            />
            {inquiry.delivery_type === 'delivery' && addr && (
              <DetailRow label="Address" value={formatAddress(addr)} />
            )}
            {inquiry.admin_price && (
              <div className="pt-2 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Subtotal</span>
                  <span className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                    {formatKWD(inquiry.admin_price)}
                  </span>
                </div>
                {Number(inquiry.discount) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Discount</span>
                    <span className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>
                      − {formatKWD(inquiry.discount)}
                    </span>
                  </div>
                )}
                {inquiry.delivery_type === 'delivery' && Number(inquiry.delivery_charge) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Delivery</span>
                    <span className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                      + {formatKWD(inquiry.delivery_charge)}
                    </span>
                  </div>
                )}
                <div
                  className="flex items-center justify-between pt-1.5 mt-0.5 border-t"
                  style={{ borderColor: 'var(--color-border-strong)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                    Total
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
                  >
                    {formatKWD(String(orderTotal(inquiry.admin_price, inquiry.discount, inquiry.delivery_charge)))}
                  </span>
                </div>
                {inquiry.deposit_amount && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                    Security Deposit: {formatKWD(inquiry.deposit_amount)}
                    {inquiry.payment_method === 'wamd' ? ' via WAMD (bank transfer by phone number)' : ' cash'}
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
            style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: 'var(--color-warning)' }}>
              <Info size={15} weight="bold" />
              Dietary requirements
            </p>
            <div className="flex flex-wrap gap-2">
              {inquiry.allergen_nut_free && <AllergenPill label="Nut-free" />}
              {inquiry.allergen_dairy_free && <AllergenPill label="Dairy-free" />}
              {inquiry.allergen_egg_free && <AllergenPill label="Egg-free" />}
              {inquiry.allergen_raw_sugar && <AllergenPill label="Raw sugar (no refined sugar)" />}
              {inquiry.allergen_other && (
                <span
                  dir="auto"
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
                >
                  {inquiry.allergen_other}
                </span>
              )}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--color-ink-secondary)' }}>
              These requirements will be confirmed with us before your cake is prepared.
            </p>
          </section>
        )}

        {/* Reference photo upload */}
        <CustomerPhotoUpload token={token} initialImages={referenceImages ?? []} />

        {/* Confirmation form */}
        {inquiry.admin_price ? (
          <ConfirmForm
            token={token}
            inquiryId={inquiry.id}
            deliveryType={inquiry.delivery_type}
            currentPickupTime={inquiry.pickup_time}
            currentMessageOnCake={firstItem?.message_on_cake ?? ''}
            currentSpecialRequirements={firstItem?.special_requirements ?? ''}
            existingAddress={addr}
            waNumber={waNumber}
            firstItemLabel={firstItem ? orderSummary([firstItem]) : 'cake'}
            hasMultipleItems={items.length > 1}
          />
        ) : (
          <section
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              Price pending — we'll send you an updated link once your quote is ready.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}

function SelectionPill({ label }: { label: string }) {
  return (
    <span
      dir="auto"
      className="text-xs font-medium px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-ink-secondary)',
        border: '1px solid var(--color-border-strong)',
      }}
    >
      {label}
    </span>
  )
}

function AllergenPill({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-medium px-3 py-1.5 rounded-full"
      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
    >
      {label}
    </span>
  )
}

function StatusPage({
  title,
  message,
  businessInstagram,
  waNumber,
}: {
  title: string
  message: string
  businessInstagram: string
  waNumber: string
}) {
  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <Navbar businessInstagram={businessInstagram} />

      <div className="flex flex-col items-center justify-center px-5 py-16 text-center gap-3">
        <p
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          {title}
        </p>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-ink-muted)' }}>
          {message}
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium mt-2"
            style={{ color: 'var(--color-ink-secondary)' }}
          >
            Message us →
          </a>
        )}
      </div>
    </main>
  )
}
