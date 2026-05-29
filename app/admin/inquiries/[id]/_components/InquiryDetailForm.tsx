'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { inquirySchema } from '@/lib/validations/inquiry'
import { updateInquiry } from '@/lib/actions/inquiries'
import { upsertCustomer } from '@/lib/actions/customers'
import { Copy, WhatsappLogo } from '@phosphor-icons/react'
import type { OptionRow, Inquiry, BlackoutDate } from '@/lib/supabase/types'
import { z } from 'zod'
import { GOVERNORATE_LABELS } from '@/lib/utils'

const fullSchema = inquirySchema.and(
  z.object({
    address_governorate: z.string().optional(),
    address_area: z.string().optional(),
    address_block: z.string().optional(),
    address_street: z.string().optional(),
    address_house_no: z.string().optional(),
    address_extra_notes: z.string().optional(),
  })
)

type FullFormData = z.infer<typeof fullSchema>

interface Props {
  inquiry: Inquiry & { delivery_address?: { governorate: string; area: string; block: string; street: string; house_no: string; extra_notes?: string } | null }
  options: {
    flavors: OptionRow[]
    sizes: OptionRow[]
    occasions: OptionRow[]
    themes: OptionRow[]
    decorations: OptionRow[]
  }
  minLeadDays?: number
  blackouts?: BlackoutDate[]
  pricingMatrix?: Record<string, number>
  minPriceGuard?: number
  rushMultiplier?: number
}

function whatsappUrl(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('965') ? cleaned : `965${cleaned}`
  return `https://wa.me/${number}`
}

export default function InquiryDetailForm({
  inquiry,
  options,
  minLeadDays,
  blackouts,
  pricingMatrix,
  minPriceGuard,
  rushMultiplier,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copiedPhone, setCopiedPhone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FullFormData>({
    resolver: zodResolver(fullSchema) as any,
    defaultValues: {
      customer_name: inquiry.customer_name,
      customer_phone: inquiry.customer_phone,
      cake_size: inquiry.cake_size,
      flavor: inquiry.flavor,
      occasion: inquiry.occasion,
      theme: inquiry.theme,
      decoration_style: inquiry.decoration_style,
      message_on_cake: inquiry.message_on_cake,
      quantity: inquiry.quantity,
      special_requirements: inquiry.special_requirements,
      allergen_nut_free: inquiry.allergen_nut_free,
      allergen_gluten_free: inquiry.allergen_gluten_free,
      allergen_dairy_free: inquiry.allergen_dairy_free,
      allergen_egg_free: inquiry.allergen_egg_free,
      allergen_halal: inquiry.allergen_halal,
      allergen_other: inquiry.allergen_other,
      balance_paid: inquiry.balance_paid,
      event_date: inquiry.event_date,
      pickup_time: inquiry.pickup_time ?? undefined,
      delivery_type: inquiry.delivery_type,
      admin_price: inquiry.admin_price ? Number(inquiry.admin_price) : undefined,
      advance_amount: inquiry.advance_amount ? Number(inquiry.advance_amount) : undefined,
      advance_paid: inquiry.advance_paid,
      payment_method: inquiry.payment_method,
      admin_notes: inquiry.admin_notes,
      priority: inquiry.priority,
      address_governorate: inquiry.delivery_address?.governorate ?? '',
      address_area: inquiry.delivery_address?.area ?? '',
      address_block: inquiry.delivery_address?.block ?? '',
      address_street: inquiry.delivery_address?.street ?? '',
      address_house_no: inquiry.delivery_address?.house_no ?? '',
      address_extra_notes: inquiry.delivery_address?.extra_notes ?? '',
    },
  })

  const deliveryType = watch('delivery_type')
  const watchedPhone = watch('customer_phone')
  const watchedEventDate = watch('event_date')
  const watchedCakeSize = watch('cake_size')
  const watchedPrice = watch('admin_price')
  const watchedAdvance = watch('advance_amount')

  const isWithinLeadTime = (date: string): boolean => {
    if (!date || !minLeadDays) return false
    const d = new Date(date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + minLeadDays)
    return d < cutoff
  }

  const isDateBlackedOut = (date: string): boolean => {
    if (!date || !blackouts?.length) return false
    const d = new Date(date)
    return blackouts.some((b) => new Date(b.date_from) <= d && d <= new Date(b.date_to))
  }

  const suggestedBase = pricingMatrix && watchedCakeSize ? pricingMatrix[watchedCakeSize] : undefined
  const isRush =
    suggestedBase !== undefined && watchedEventDate
      ? (() => {
          const d = new Date(watchedEventDate)
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() + (minLeadDays ?? 3) + 2)
          return d < cutoff
        })()
      : false
  const suggestedRush =
    isRush && rushMultiplier && suggestedBase ? suggestedBase * rushMultiplier : undefined

  // Countdown chip
  const daysUntil = watchedEventDate
    ? Math.ceil((new Date(watchedEventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const countdownColor =
    daysUntil !== null && daysUntil <= 1
      ? 'var(--color-danger)'
      : daysUntil !== null && daysUntil <= 3
      ? '#92600f'
      : 'var(--color-ink-muted)'

  // Balance bar
  const priceNum = watchedPrice ? Number(watchedPrice) : null
  const advanceNum = watchedAdvance ? Number(watchedAdvance) : null
  const balanceFill =
    priceNum && advanceNum && priceNum > 0 ? Math.min((advanceNum / priceNum) * 100, 100) : 0
  const balanceRemaining = priceNum && advanceNum ? priceNum - advanceNum : null
  const isSettled = balanceRemaining !== null && balanceRemaining <= 0

  const onSubmit = (data: FullFormData) => {
    startTransition(async () => {
      const {
        address_governorate, address_area, address_block, address_street,
        address_house_no, address_extra_notes, ...inquiryData
      } = data

      const addressData =
        deliveryType === 'delivery' && address_area
          ? {
              governorate: address_governorate,
              area: address_area,
              block: address_block,
              street: address_street,
              house_no: address_house_no,
              extra_notes: address_extra_notes,
            }
          : undefined

      const result = await updateInquiry(inquiry.id, inquiryData, addressData)

      if (result.error) {
        toast.error('Failed to save', { description: result.error })
        return
      }
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, msgs]) => {
          setError(field as keyof FullFormData, { message: (msgs as string[])[0] })
        })
        return
      }

      if (inquiryData.customer_phone && inquiryData.customer_name) {
        void upsertCustomer(inquiryData.customer_phone, inquiryData.customer_name)
      }

      toast.success('Saved')
      router.refresh()
    })
  }

  const ic = 'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-teal)] focus:ring-2 focus:ring-[var(--color-teal-light)]'
  const is: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-ink)',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Card 1: Customer & Contact */}
      <div
        className="rounded-xl border divide-y"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Customer & Contact
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
                Name
              </label>
              <input {...register('customer_name')} className={ic} style={is} />
              {errors.customer_name && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.customer_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
                Phone
              </label>
              <div className="flex gap-2 items-center">
                <input
                  {...register('customer_phone')}
                  className={ic + ' flex-1 min-w-0'}
                  style={is}
                  placeholder="+965 XXXX XXXX"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(watchedPhone ?? '')
                    setCopiedPhone(true)
                    setTimeout(() => setCopiedPhone(false), 2000)
                  }}
                  className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97]"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    color: 'var(--color-ink-secondary)',
                  }}
                  title="Copy phone"
                >
                  <Copy size={15} />
                </button>
                <a
                  href={whatsappUrl(watchedPhone ?? '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97]"
                  style={{
                    borderColor: '#d1fae5',
                    backgroundColor: '#f0fdf4',
                    color: '#25D366',
                  }}
                  title="Open WhatsApp"
                >
                  <WhatsappLogo size={15} weight="fill" />
                </a>
              </div>
              {errors.customer_phone && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.customer_phone.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Cake & Event */}
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Cake & Event
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Size</label>
              <select {...register('cake_size')} className={ic} style={is}>
                <option value="">Select size</option>
                {options.sizes.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Flavor</label>
              <select {...register('flavor')} className={ic} style={is}>
                <option value="">Select flavor</option>
                {options.flavors.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Occasion</label>
              <select {...register('occasion')} className={ic} style={is}>
                <option value="">— Optional —</option>
                {options.occasions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Theme</label>
              <select {...register('theme')} className={ic} style={is}>
                <option value="">— Optional —</option>
                {options.themes.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Decorations</label>
              <select {...register('decoration_style')} className={ic} style={is}>
                <option value="">Select style</option>
                {options.decorations.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Message on Cake</label>
              <input {...register('message_on_cake')} placeholder="Happy Birthday…" className={ic} style={is} />
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
                Event Date
                {daysUntil !== null && (
                  <span
                    className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${countdownColor}18`, color: countdownColor }}
                  >
                    {daysUntil <= 0 ? 'Past' : `${daysUntil}d left`}
                  </span>
                )}
              </label>
              <input {...register('event_date')} type="date" className={ic} style={is} />
              {watchedEventDate && isDateBlackedOut(watchedEventDate) && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>Date is blocked</p>
              )}
              {watchedEventDate && !isDateBlackedOut(watchedEventDate) && isWithinLeadTime(watchedEventDate) && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>
                  Within lead time ({minLeadDays}d)
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Pickup Time</label>
              <input {...register('pickup_time')} type="time" className={ic} style={is} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Delivery Type</label>
              <div className="flex gap-4">
                {(['pickup', 'delivery'] as const).map(val => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input {...register('delivery_type')} type="radio" value={val} className="accent-[color:var(--color-teal)]" />
                    <span className="text-sm capitalize" style={{ color: 'var(--color-ink-secondary)' }}>{val}</span>
                  </label>
                ))}
              </div>
            </div>
            {deliveryType === 'delivery' && (
              <div className="col-span-2 pt-3 border-t grid grid-cols-2 gap-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Governorate</label>
                  <select {...register('address_governorate')} className={ic} style={is}>
                    <option value="">Select</option>
                    {Object.entries(GOVERNORATE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Area</label>
                  <input {...register('address_area')} placeholder="Salmiya" className={ic} style={is} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Block</label>
                  <input {...register('address_block')} placeholder="4" className={ic} style={is} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Street</label>
                  <input {...register('address_street')} placeholder="Street 10" className={ic} style={is} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>House No.</label>
                  <input {...register('address_house_no')} placeholder="Villa 15" className={ic} style={is} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Extra Notes</label>
                  <input {...register('address_extra_notes')} placeholder="Ring bell twice" className={ic} style={is} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Pricing & Admin */}
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Pricing & Admin
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Price (KD)</label>
              <input
                {...register('admin_price', { valueAsNumber: true })}
                type="number"
                step="0.001"
                min="0"
                placeholder="12.500"
                className={ic}
                style={{ ...is, fontFamily: 'var(--font-mono)' }}
              />
              {(suggestedBase !== undefined || suggestedRush !== undefined) && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  {suggestedBase !== undefined && (
                    <button
                      type="button"
                      onClick={() => setValue('admin_price', suggestedBase)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
                    >
                      Suggested: KD {suggestedBase.toFixed(3)}
                    </button>
                  )}
                  {suggestedRush !== undefined && (
                    <button
                      type="button"
                      onClick={() => setValue('admin_price', suggestedRush)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                    >
                      Rush: KD {suggestedRush.toFixed(3)}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Advance (KD)</label>
              <input
                {...register('advance_amount', { valueAsNumber: true })}
                type="number"
                step="0.001"
                min="0"
                placeholder="5.000"
                className={ic}
                style={{ ...is, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {/* Balance bar */}
          {priceNum && priceNum > 0 && (
            <div className="mt-3">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface-raised)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${balanceFill}%`,
                    backgroundColor: 'var(--color-teal)',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: isSettled ? 'var(--color-success)' : 'var(--color-ink-muted)' }}>
                {isSettled ? 'Settled' : balanceRemaining !== null ? `KD ${balanceRemaining.toFixed(3)} remaining` : ''}
              </p>
            </div>
          )}

          <div className="mt-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Payment Method</label>
            <select {...register('payment_method')} className={ic} style={is}>
              <option value="">Not set</option>
              <option value="cash">Cash</option>
              <option value="wamd">WAMD</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Priority</label>
              <select {...register('priority', { valueAsNumber: true })} className={ic} style={is}>
                <option value={0}>Normal</option>
                <option value={1}>High</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Admin Notes</label>
            <textarea
              {...register('admin_notes')}
              rows={3}
              placeholder="Notes visible only to you…"
              className={ic + ' resize-none'}
              style={is}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60"
        style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
      >
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
