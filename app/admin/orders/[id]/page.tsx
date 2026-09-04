import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOptions } from '@/lib/actions/options'
import { getSettings, getBlackouts } from '@/lib/actions/settings'
import { getInquiryImages } from '@/lib/actions/images'
import {
  formatKWD,
  confirmationLink,
  trackingLink,
  myOrdersLink,
  orderSummary,
} from '@/lib/utils'
import { pendingRecordLabel } from '@/lib/format'
import { generatePortalToken } from '@/lib/portal'
import { derivePaymentStatus, balanceOwed, orderTotal } from '@/lib/payments'
import { StatusBadge, PaymentBadge } from '@/components/admin/StatusBadge'
import InquiryActions from './_components/InquiryActions'
import InquiryDetailForm from './_components/InquiryDetailForm'
import CancelInquiryButton from './_components/CancelInquiryButton'
import CollapsibleImages from './_components/CollapsibleImages'
import CustomerChangesBanner from './_components/CustomerChangesBanner'
import { CreatedBanner } from './_components/CreatedBanner'
import OrderDetailActions from './_components/OrderDetailActions'
import OrderEtaSection from './_components/OrderEtaSection'
import OrderImageSection from './_components/OrderImageSection'
import OrderWhatsAppActions from './_components/OrderWhatsAppActions'
import PaymentHistorySection from './_components/PaymentHistorySection'
import InvoicePrint from '@/components/admin/InvoicePrint'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import type { InquiryItem, InquiryStatus, Payment, PaymentMethod, WhatsAppTemplates } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('inquiries').select('customer_name, status, source').eq('id', id).single()
  const recordLabel = data?.status === 'pending' ? pendingRecordLabel(data.source as 'admin' | 'public_form') : 'Order'
  return { title: data?.customer_name ? `${data.customer_name} — ${recordLabel}` : recordLabel }
}

const TIMELINE_STEPS: { status: InquiryStatus; label: string }[] = [
  { status: 'pending', label: 'Inquired' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'delivered', label: 'Delivered' },
]

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  delivered: 2,
  cancelled: -1,
}

function OrderTimeline({ currentStatus, source }: { currentStatus: InquiryStatus; source: 'admin' | 'public_form' }) {
  const currentIdx = STATUS_ORDER[currentStatus] ?? 0

  return (
    <div className="flex justify-center items-center mb-4 overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIdx = STATUS_ORDER[step.status]
        const isPast = stepIdx < currentIdx
        const isCurrent = stepIdx === currentIdx
        // Every step but 'pending' already reads unambiguously as an order stage —
        // only the pending step's label depends on how the record originated.
        const label = step.status === 'pending' ? pendingRecordLabel(source) : step.label

        return (
          <div key={step.status} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                style={{
                  backgroundColor: isPast || isCurrent ? 'var(--color-teal)' : 'var(--color-surface-raised)',
                  borderColor: isCurrent ? 'var(--color-teal)' : isPast ? 'var(--color-teal)' : 'var(--color-border)',
                  boxShadow: isCurrent ? '0 0 0 3px var(--color-teal-light)' : undefined,
                }}
              />
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{
                  color: isCurrent
                    ? 'var(--color-teal)'
                    : isPast
                    ? 'var(--color-teal-deep)'
                    : 'var(--color-ink-muted)',
                  fontWeight: isCurrent ? 700 : undefined,
                }}
              >
                {label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className="h-0.5 w-8 shrink-0 mx-0.5 -mt-4"
                style={{
                  backgroundColor:
                    stepIdx < currentIdx ? 'var(--color-teal)' : 'var(--color-border)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { created } = await searchParams
  const supabase = await createClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('*, delivery_address:delivery_addresses(*), items:inquiry_items(*)')
    .eq('id', id)
    .single()

  if (error || !inquiry) {
    // Old bookmarks / shared links may still carry an orders.id rather than an
    // inquiries.id (the two were separate routes before this merge). Redirect
    // to the equivalent inquiry-keyed URL rather than 404ing them.
    const { data: legacyOrder } = await supabase.from('orders').select('inquiry_id').eq('id', id).maybeSingle()
    if (legacyOrder?.inquiry_id) redirect(`/admin/orders/${legacyOrder.inquiry_id}`)
    notFound()
  }

  const customerId = (inquiry as any).customer_id
  const myOrdersUrl = customerId ? myOrdersLink(generatePortalToken(customerId)) : undefined

  // Everything here only depends on `inquiry`/`id` from the lookup above, so it all fires
  // in one wave — customerData, payments, and pastOrderCount used to be awaited one after
  // another *after* this Promise.all with no actual data dependency, adding three extra
  // sequential round-trips (and a few real seconds on a slow connection) to a page that's
  // reached straight from a create/save submit, right when the nav-progress bar and the
  // success toast are both racing to still be visible.
  const [
    flavors,
    sizes,
    occasions,
    items,
    settingsResult,
    blackoutsResult,
    imagesResult,
    { data: order },
    paymentsResult,
    { data: customerData },
    { count: pastOrderCount },
  ] = await Promise.all([
    getOptions('flavor_options'),
    getOptions('size_options'),
    getOptions('occasion_options'),
    getOptions('item_options'),
    getSettings([
      'whatsapp_templates',
      'min_lead_days',
      'pricing_matrix',
      'min_price_guard',
      'rush_multiplier',
      'business_phone',
      'business_instagram',
    ]),
    getBlackouts(),
    getInquiryImages(id),
    supabase.from('orders').select('*').eq('inquiry_id', id).maybeSingle(),
    // Payments are keyed to the inquiry (migration 037): fetching by inquiry_id rather
    // than order_id also catches any pre-confirmation orphan payments.
    supabase.from('payments').select('*').eq('inquiry_id', inquiry.id).order('paid_at', { ascending: false }),
    customerId
      ? supabase.from('customers').select('*').eq('id', customerId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('orders')
      .select('id, inquiry:inquiries!inner(customer_phone)', { count: 'exact', head: true })
      .eq('inquiry.customer_phone', inquiry.customer_phone)
      .neq('inquiry.id', inquiry.id)
      .in('status', ['confirmed', 'delivered']),
  ])

  const fetchResults = {
    flavors,
    sizes,
    occasions,
    items,
    settings: settingsResult,
    'blackout dates': blackoutsResult,
    images: imagesResult,
  }
  for (const [name, res] of Object.entries(fetchResults)) {
    if (res.error) throw new Error(`Order: failed to load ${name} — ${res.error}`)
  }
  if (paymentsResult.error) throw new Error(`Order: failed to load payments — ${paymentsResult.error.message}`)
  const payments = (paymentsResult.data ?? []) as unknown as Payment[]

  const confirmLink = confirmationLink(inquiry.confirmation_token)
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined
  const minLeadDays = parseInt((settingsResult.data?.min_lead_days as string) ?? '3')
  const pricingMatrix = (settingsResult.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsResult.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsResult.data?.rush_multiplier ?? 1.3)
  const businessPhone = (settingsResult.data?.business_phone as string) ?? ''
  const businessInstagram = (settingsResult.data?.business_instagram as string) ?? ''

  const isCancelled = inquiry.status === 'cancelled'

  // The same inquiry_images table backs two separate galleries (reference photos the
  // customer/admin add before the cake is made, finished photos added after) — split
  // the single fetch by image_type rather than issuing it twice.
  const allImages = imagesResult.data ?? []
  const referenceImages = allImages.filter((img) => img.image_type === 'reference')
  const finishedImages = allImages.filter((img) => img.image_type === 'finished')

  // Total / Paid / Balance — derived from the ledger, never a hand-typed field.
  // Once an order exists, final_price is the source of truth (kept re-synced with
  // admin_price/discount/delivery on edit — Phase 1.4). Before confirmation there is
  // no orders row yet, so the total is computed the same way the list pages do.
  const orderTotalKwd = order
    ? Number(order.final_price ?? 0)
    : orderTotal(inquiry.admin_price, inquiry.discount, inquiry.delivery_charge)
  const amountPaidKwd = Number(inquiry.amount_paid ?? 0)
  const settled = !!inquiry.fully_paid
  const paymentStatus = derivePaymentStatus(amountPaidKwd, orderTotalKwd, settled)
  const balanceKwd = balanceOwed(orderTotalKwd, amountPaidKwd, settled)
  const paidPct = orderTotalKwd > 0 ? Math.min(100, Math.round((amountPaidKwd / orderTotalKwd) * 100)) : 0

  const trackLink = order ? trackingLink(order.tracking_token) : null

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <div className="no-print">
        {/* Back link */}
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          <ArrowLeft size={13} />
          Orders
        </Link>

        <CreatedBanner created={created === '1'} />

        {/* Sticky header card */}
        <div
          className="rounded-xl border p-4 mb-4 flex items-start justify-between gap-4"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              {inquiry.status === 'pending' ? pendingRecordLabel(inquiry.source as 'admin' | 'public_form') : 'Order'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
              >
                {inquiry.customer_name}
              </h1>
              {customerData?.vip && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                >
                  VIP
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              {orderSummary(inquiry.items ?? [])}
              {inquiry.admin_price ? ` · ${formatKWD(inquiry.admin_price?.toString())}` : ''}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <StatusBadge status={inquiry.status as InquiryStatus} source={inquiry.source as 'admin' | 'public_form'} />
            {(pastOrderCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
              >
                Returning · {pastOrderCount}
              </span>
            )}
          </div>
        </div>

        {/* Actions: Next Step banner + WA buttons */}
        {!isCancelled && (
          <InquiryActions
            inquiry={inquiry as any}
            confirmLink={confirmLink}
            templates={templates}
            fallbackLinkUrl={myOrdersUrl}
          />
        )}

        {/* Timeline */}
        {!isCancelled && (
          <OrderTimeline currentStatus={inquiry.status as InquiryStatus} source={inquiry.source as 'admin' | 'public_form'} />
        )}

        {/* What the customer changed / said before confirming or requesting changes */}
        <CustomerChangesBanner
          diff={(inquiry as any).customer_edit_diff ?? null}
          comments={inquiry.customer_comments ?? ''}
        />

        {/* Total / Paid / Balance */}
        <div
          className="rounded-xl border p-4 mb-6"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
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

        {/* Items */}
        {inquiry.items && inquiry.items.length > 0 && (
          <div
            className="rounded-xl border p-4 mb-6 flex flex-col gap-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
              {inquiry.items.length > 1 ? `Items (${inquiry.items.length})` : 'Item Details'}
            </p>
            {(inquiry.items as InquiryItem[]).map((item, i) => (
              <div
                key={item.id}
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3"
                style={i > 0 ? { paddingTop: '1rem', borderTop: '1px solid var(--color-border)' } : undefined}
              >
                <div className="sm:col-span-2">
                  <Detail label={inquiry.items!.length > 1 ? `Item ${i + 1}` : 'Cake'} value={orderSummary([item])} />
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

        {/* Grouped editable form cards */}
        <InquiryDetailForm
          inquiry={inquiry as any}
          options={{
            flavors: flavors.data ?? [],
            sizes: sizes.data ?? [],
            occasions: occasions.data ?? [],
            items: items.data ?? [],
          }}
          minLeadDays={minLeadDays}
          blackouts={blackoutsResult.data ?? []}
          pricingMatrix={pricingMatrix}
          minPriceGuard={minPriceGuard}
          rushMultiplier={rushMultiplier}
          orderId={order?.id ?? null}
          templates={templates}
        />

        {/* Order-only sections: these need an orders row (payments/ETA/actions/invoice
            are all keyed off it, or read fields — final_price, tracking_token — that
            only exist once the record is confirmed). */}
        {order && (
          <>
            <div className="mt-4" id="payment-history">
              <PaymentHistorySection
                inquiryId={inquiry.id}
                orderId={order.id}
                payments={payments}
                orderTotal={orderTotalKwd}
                amountPaid={amountPaidKwd}
                customerName={inquiry.customer_name ?? ''}
                customerPhone={inquiry.customer_phone ?? ''}
                defaultMethod={(inquiry.payment_method || 'cash') as PaymentMethod}
                templates={templates}
              />
            </div>

            <div className="mt-4">
              <OrderEtaSection
                orderId={order.id}
                initialDate={(order as any).eta_date ?? null}
                initialTime={(order as any).eta_time ?? null}
                initialNote={(order as any).eta_note ?? ''}
              />
            </div>

            <div className="mt-4">
              <OrderWhatsAppActions
                order={{ final_price: order.final_price, amount_paid: order.amount_paid, tracking_token: order.tracking_token }}
                inquiry={{
                  customer_name: inquiry.customer_name,
                  customer_phone: inquiry.customer_phone,
                  fully_paid: inquiry.fully_paid,
                }}
                templates={templates}
                myOrdersUrl={myOrdersUrl}
              />
            </div>
          </>
        )}

        {/* Finished Cake Photos — only needs the inquiry id, so it can be added even
            before the order is confirmed (matches how reference images already work). */}
        <div className="mt-4">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Finished Cake Photos
          </p>
          <OrderImageSection initialImages={finishedImages} inquiryId={inquiry.id} />
        </div>

        {/* Reference Images */}
        <div className="mt-4">
          <CollapsibleImages inquiryId={id} initialImages={referenceImages} />
        </div>

        {/* Customer Profile card */}
        {customerData && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ borderColor: 'var(--color-teal-light)', backgroundColor: 'var(--color-teal-light)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-teal-deep)' }}
            >
              Customer Profile
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              {customerData.name}
              {customerData.vip && (
                <span
                  className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                >
                  VIP
                </span>
              )}
            </p>
            {customerData.notes && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                {customerData.notes}
              </p>
            )}
          </div>
        )}

        {/* Order-only actions: tracking link, advance/cancel order, print/download */}
        {order && trackLink && (
          <div className="mt-4">
            <OrderDetailActions
              order={order as any}
              trackingLink={trackLink}
              inquiry={{ customer_name: inquiry.customer_name ?? '', id: inquiry.id }}
            />
          </div>
        )}

        {/* Cancel button */}
        {!isCancelled && <CancelInquiryButton inquiryId={id} />}
      </div>

      {/* Invoice print component — order-only, needs final_price/tracking_token/etc. */}
      {order && (
        <InvoicePrint
          order={order as any}
          inquiry={inquiry as any}
          businessPhone={businessPhone}
          businessInstagram={businessInstagram}
          invoiceNumber={(order as any).invoice_number ?? null}
        />
      )}
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
