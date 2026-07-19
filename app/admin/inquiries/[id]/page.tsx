import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOptions } from '@/lib/actions/options'
import { getSettings, getBlackouts } from '@/lib/actions/settings'
import { getInquiryImages } from '@/lib/actions/images'
import { formatKWD, confirmationLink } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'
import InquiryActions from './_components/InquiryActions'
import InquiryDetailForm from './_components/InquiryDetailForm'
import CancelInquiryButton from './_components/CancelInquiryButton'
import CollapsibleImages from './_components/CollapsibleImages'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'
import type { WhatsAppTemplates, InquiryStatus } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('inquiries').select('customer_name').eq('id', id).single()
  return { title: data?.customer_name ? `${data.customer_name} — Inquiry` : 'Inquiry' }
}

const TIMELINE_STEPS: { status: InquiryStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'awaiting_confirmation', label: 'Awaiting' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'ready', label: 'Ready' },
  { status: 'delivered', label: 'Dispatched' },
]

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  awaiting_confirmation: 1,
  confirmed: 2,
  ready: 3,
  delivered: 4,
  cancelled: -1,
}

function OrderTimeline({ currentStatus }: { currentStatus: InquiryStatus }) {
  const currentIdx = STATUS_ORDER[currentStatus] ?? 0

  return (
    <div className="flex justify-center items-center mb-4 overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIdx = STATUS_ORDER[step.status]
        const isPast = stepIdx < currentIdx
        const isCurrent = stepIdx === currentIdx
        const isFuture = stepIdx > currentIdx

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
                {step.label}
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

export default async function InquiryDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('*, delivery_address:delivery_addresses(*)')
    .eq('id', id)
    .single()

  if (error || !inquiry) notFound()

  const [flavors, sizes, occasions, settingsResult, blackoutsResult, imagesResult] =
    await Promise.all([
      getOptions('flavor_options'),
      getOptions('size_options'),
      getOptions('occasion_options'),
      getSettings(['whatsapp_templates', 'min_lead_days', 'pricing_matrix', 'min_price_guard', 'rush_multiplier']),
      getBlackouts(),
      getInquiryImages(id),
    ])

  const confirmLink = confirmationLink(inquiry.confirmation_token)
  const templates = settingsResult.data?.whatsapp_templates as WhatsAppTemplates | undefined
  const minLeadDays = parseInt((settingsResult.data?.min_lead_days as string) ?? '3')
  const pricingMatrix = (settingsResult.data?.pricing_matrix as Record<string, number>) ?? {}
  const minPriceGuard = Number(settingsResult.data?.min_price_guard ?? 3)
  const rushMultiplier = Number(settingsResult.data?.rush_multiplier ?? 1.3)

  const customerId = (inquiry as any).customer_id
  let customerData = null
  if (customerId) {
    const { data } = await supabase.from('customers').select('*').eq('id', customerId).single()
    customerData = data
  }

  const { count: pastOrderCount } = await supabase
    .from('orders')
    .select('id, inquiry:inquiries!inner(customer_phone)', { count: 'exact', head: true })
    .eq('inquiry.customer_phone', inquiry.customer_phone)
    .neq('inquiry.id', inquiry.id)
    .in('status', ['confirmed', 'ready', 'delivered'])

  const isCancelled = inquiry.status === 'cancelled'

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/inquiries"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        <ArrowLeft size={13} />
        Inquiries
      </Link>

      {/* Sticky header card */}
      <div
        className="rounded-xl border p-4 mb-4 flex items-start justify-between gap-4"
        style={{
          backgroundColor: 'var(--color-surface-raised)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
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
            {inquiry.cake_size} · {inquiry.flavor}
            {inquiry.admin_price ? ` · ${formatKWD(inquiry.admin_price?.toString())}` : ''}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <StatusBadge status={inquiry.status as InquiryStatus} />
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
        />
      )}

      {/* Timeline */}
      {!isCancelled && (
        <OrderTimeline currentStatus={inquiry.status as InquiryStatus} />
      )}

      {/* Grouped editable form cards */}
      <InquiryDetailForm
        inquiry={inquiry as any}
        options={{
          flavors: flavors.data ?? [],
          sizes: sizes.data ?? [],
          occasions: occasions.data ?? [],
        }}
        minLeadDays={minLeadDays}
        blackouts={blackoutsResult.data ?? []}
        pricingMatrix={pricingMatrix}
        minPriceGuard={minPriceGuard}
        rushMultiplier={rushMultiplier}
      />

      {/* Reference Images */}
      <div className="mt-4">
        <CollapsibleImages inquiryId={id} initialImages={imagesResult.data ?? []} />
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

      {/* Cancel button */}
      {!isCancelled && <CancelInquiryButton inquiryId={id} />}
    </div>
  )
}

