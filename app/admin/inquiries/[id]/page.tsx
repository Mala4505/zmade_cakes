import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOptions } from '@/lib/actions/options'
import { getSettings, getBlackouts } from '@/lib/actions/settings'
import { getInquiryImages } from '@/lib/actions/images'
import { formatDate, formatTime, formatKWD, confirmationLink, trackingLink, GOVERNORATE_LABELS } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge, PriorityBadge } from '@/components/admin/StatusBadge'
import InquiryForm from '../_components/InquiryForm'
import InquiryActions from './_components/InquiryActions'
import InquiryImageSection from './_components/InquiryImageSection'
import type { Metadata } from 'next'
import type { WhatsAppTemplates } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('inquiries').select('customer_name').eq('id', id).single()
  return { title: data?.customer_name ? `${data.customer_name} — Inquiry` : 'Inquiry' }
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

  const [flavors, sizes, occasions, themes, decorations, settingsResult, blackoutsResult, imagesResult] = await Promise.all([
    getOptions('flavor_options'),
    getOptions('size_options'),
    getOptions('occasion_options'),
    getOptions('theme_options'),
    getOptions('decoration_style_options'),
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

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader
        title={inquiry.customer_name}
        subtitle={`${inquiry.cake_size} · ${inquiry.flavor} · ${formatDate(inquiry.event_date)}`}
        backHref="/admin/inquiries"
        backLabel="Inquiries"
        action={<StatusBadge status={inquiry.status} />}
      />

      {/* Summary card */}
      <div
        className="rounded-xl border p-4 mb-6 grid grid-cols-2 gap-x-6 gap-y-3"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <Detail label="Phone" value={inquiry.customer_phone} mono />
        <Detail label="Event Date" value={formatDate(inquiry.event_date)} mono />
        <Detail label="Pickup Time" value={formatTime(inquiry.pickup_time)} mono />
        <Detail label="Delivery" value={inquiry.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} />
        {inquiry.delivery_type === 'delivery' && (inquiry as any).delivery_address && (
          <div className="col-span-2">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>Address</p>
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
              {GOVERNORATE_LABELS[(inquiry as any).delivery_address.governorate as keyof typeof GOVERNORATE_LABELS]},
              {' '}{(inquiry as any).delivery_address.area},
              {' Block '}{(inquiry as any).delivery_address.block},
              {' '}{(inquiry as any).delivery_address.street},
              {' '}{(inquiry as any).delivery_address.house_no}
            </p>
          </div>
        )}
        <Detail label="Price" value={formatKWD(inquiry.admin_price)} mono />
        <Detail label="Advance" value={formatKWD(inquiry.advance_amount)} mono />
        <Detail label="Payment" value={inquiry.payment_method || '—'} />
        <Detail label="Priority" value={null}>
          <PriorityBadge priority={inquiry.priority as 0 | 1 | 2} />
        </Detail>
        {inquiry.admin_notes && (
          <div className="col-span-2">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>Admin Notes</p>
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>{inquiry.admin_notes}</p>
          </div>
        )}
        {inquiry.customer_confirmed && (
          <>
            <div className="col-span-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-teal)' }}>Customer Confirmed</p>
            </div>
            {inquiry.message_on_cake && (
              <Detail label="Message on Cake" value={inquiry.message_on_cake} />
            )}
            {inquiry.customer_comments && (
              <div className="col-span-2">
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>Customer Comments</p>
                <p className="text-sm italic" style={{ color: 'var(--color-ink-secondary)' }}>
                  "{inquiry.customer_comments}"
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <InquiryActions
        inquiry={inquiry as any}
        confirmLink={confirmLink}
        templates={templates}
      />

      {/* Reference Images */}
      <div className="mt-6">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Reference Images
        </p>
        <InquiryImageSection
          initialImages={imagesResult.data ?? []}
          inquiryId={id}
        />
      </div>

      {/* Customer profile card */}
      {customerData && (
        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-teal-light)', backgroundColor: 'var(--color-teal-light)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-teal-deep)' }}>Customer Profile</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {customerData.name}
            {customerData.vip && (
              <span className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>VIP</span>
            )}
          </p>
          {customerData.notes && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{customerData.notes}</p>
          )}
        </div>
      )}

      {/* Edit form */}
      <div className="mt-8">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Edit Inquiry
        </p>
        <InquiryForm
          inquiry={inquiry as any}
          options={{
            flavors: flavors.data ?? [],
            sizes: sizes.data ?? [],
            occasions: occasions.data ?? [],
            themes: themes.data ?? [],
            decorations: decorations.data ?? [],
          }}
          minLeadDays={minLeadDays}
          blackouts={blackoutsResult.data ?? []}
          pricingMatrix={pricingMatrix}
          minPriceGuard={minPriceGuard}
          rushMultiplier={rushMultiplier}
        />
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
  children,
}: {
  label: string
  value?: string | null
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </p>
      {children ?? (
        <p
          className="text-sm"
          style={{
            color: 'var(--color-ink-secondary)',
            fontFamily: mono ? 'var(--font-mono)' : undefined,
          }}
        >
          {value || '—'}
        </p>
      )}
    </div>
  )
}
