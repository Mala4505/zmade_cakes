'use client'

import { useTransition, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import PhoneInput from '@/components/PhoneInput'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { inquirySchema, deliveryAddressSchema, type InquiryFormData } from '@/lib/validations/inquiry'
import { createInquiry, updateInquiry } from '@/lib/actions/inquiries'
import { lookupCustomerByPhone, upsertCustomer } from '@/lib/actions/customers'
import type { OptionRow, Inquiry, BlackoutDate } from '@/lib/supabase/types'
import type { DeliveryAddressData } from '@/lib/validations/inquiry'
import { z } from 'zod'
import { GOVERNORATE_LABELS } from '@/lib/utils'
import { CustomerHistoryPanel } from './CustomerHistoryPanel'

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
  options: {
    flavors: OptionRow[]
    sizes: OptionRow[]
    occasions: OptionRow[]
    themes: OptionRow[]
    decorations: OptionRow[]
  }
  inquiry?: Inquiry
  minLeadDays?: number
  blackouts?: BlackoutDate[]
  pricingMatrix?: Record<string, number>
  minPriceGuard?: number
  rushMultiplier?: number
}

export default function InquiryForm({ options, inquiry, minLeadDays, blackouts, pricingMatrix, minPriceGuard, rushMultiplier }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: inquiry
      ? {
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
          admin_price: inquiry.admin_price ? parseFloat(inquiry.admin_price) : undefined,
          advance_amount: inquiry.advance_amount ? parseFloat(inquiry.advance_amount) : undefined,
          advance_paid: inquiry.advance_paid,
          payment_method: inquiry.payment_method,
          admin_notes: inquiry.admin_notes,
          priority: inquiry.priority,
        }
      : {
          quantity: 1,
          delivery_type: 'pickup',
          priority: 0,
          advance_paid: false,
          payment_method: '',
          allergen_nut_free: false,
          allergen_gluten_free: false,
          allergen_dairy_free: false,
          allergen_egg_free: false,
          allergen_halal: false,
          allergen_other: '',
          balance_paid: false,
        },
  })

  const deliveryType = watch('delivery_type')
  const watchedPhone = watch('customer_phone')
  const watchedEventDate = watch('event_date')
  const watchedCakeSize = watch('cake_size')
  const watchedPrice = watch('admin_price')

  const [customerHistory, setCustomerHistory] = useState<{
    customer: { id: string; name: string; notes: string; vip: boolean; phone: string; created_at: string; updated_at: string }
    recentInquiries: Array<{ id: string; cake_size: string; flavor: string; event_date: string; status: string }>
    totalCount: number
  } | null>(null)

  useEffect(() => {
    if (!watchedPhone || watchedPhone.trim().length < 7) {
      setCustomerHistory(null)
      return
    }
    const timer = setTimeout(async () => {
      const result = await lookupCustomerByPhone(watchedPhone.trim())
      setCustomerHistory(result.data ?? null)
    }, 500)
    return () => clearTimeout(timer)
  }, [watchedPhone])

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
  const isRush = suggestedBase !== undefined && watchedEventDate ? (() => {
    const d = new Date(watchedEventDate)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + (minLeadDays ?? 3) + 2)
    return d < cutoff
  })() : false
  const suggestedRush = isRush && rushMultiplier && suggestedBase ? suggestedBase * rushMultiplier : undefined

  const onSubmit = (data: FullFormData) => {
    startTransition(async () => {
      const { address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes, ...inquiryData } = data

      const addressData = deliveryType === 'delivery' && address_area
        ? {
            governorate: address_governorate,
            area: address_area,
            block: address_block,
            street: address_street,
            house_no: address_house_no,
            extra_notes: address_extra_notes,
          }
        : undefined

      const result = inquiry
        ? await updateInquiry(inquiry.id, inquiryData, addressData)
        : await createInquiry(inquiryData, addressData)

      if (result.error) {
        setError('root', { message: result.error })
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

      router.push(inquiry ? `/admin/inquiries/${inquiry.id}` : `/admin/inquiries/${result.data!.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {errors.root && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
        >
          {errors.root.message}
        </div>
      )}

      {/* Customer info */}
      <Section title="Customer">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" error={errors.customer_name?.message} required>
            <input {...register('customer_name')} placeholder="Fatima Al-Ahmad" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Phone" error={errors.customer_phone?.message} required>
            <PhoneInput
              value={watchedPhone}
              onChange={value => setValue('customer_phone', value, { shouldValidate: true })}
            />
          </Field>
        </div>
        {customerHistory && (
          <CustomerHistoryPanel
            data={customerHistory}
            onPrefill={(cakeSize, flavor) => {
              setValue('cake_size', cakeSize)
              setValue('flavor', flavor)
            }}
          />
        )}
      </Section>

      {/* Cake details */}
      <Section title="Cake Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Size" error={errors.cake_size?.message} required>
            <select {...register('cake_size')} className={inputClass} style={inputStyle}>
              <option value="">Select size</option>
              {options.sizes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Flavor" error={errors.flavor?.message} required>
            <select {...register('flavor')} className={inputClass} style={inputStyle}>
              <option value="">Select flavor</option>
              {options.flavors.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Occasion" error={errors.occasion?.message}>
            <select {...register('occasion')} className={inputClass} style={inputStyle}>
              <option value="">— Optional —</option>
              {options.occasions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Theme" error={errors.theme?.message}>
            <select {...register('theme')} className={inputClass} style={inputStyle}>
              <option value="">— Optional —</option>
              {options.themes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Decoration Style" error={errors.decoration_style?.message} required className="col-span-2">
            <select {...register('decoration_style')} className={inputClass} style={inputStyle}>
              <option value="">Select style</option>
              {options.decorations.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Message on Cake" error={errors.message_on_cake?.message} className="col-span-2">
            <input {...register('message_on_cake')} placeholder="Happy Birthday Sarah!" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Quantity" error={errors.quantity?.message} required>
            <input {...register('quantity', { valueAsNumber: true })} type="number" min={1} max={50} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Special Requirements" error={errors.special_requirements?.message} className="col-span-2">
            <textarea {...register('special_requirements')} rows={3} placeholder="Nut-free, extra tall, specific colours…" className={inputClass + ' resize-none'} style={inputStyle} />
          </Field>
        </div>
      </Section>

      <Section title="Dietary Requirements">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { field: 'allergen_nut_free', label: 'Nut-free' },
              { field: 'allergen_gluten_free', label: 'Gluten-free' },
              { field: 'allergen_dairy_free', label: 'Dairy-free' },
              { field: 'allergen_egg_free', label: 'Egg-free' },
              { field: 'allergen_halal', label: 'Halal-certified' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-2.5 border transition-colors" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}>
                <input
                  {...register(field as keyof FullFormData)}
                  type="checkbox"
                  className="accent-[color:var(--color-danger)] w-4 h-4 shrink-0"
                />
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink-secondary)' }}>{label}</span>
              </label>
            ))}
          </div>
          <Field label="Other dietary notes" error={errors.allergen_other?.message}>
            <input
              {...register('allergen_other')}
              placeholder="e.g. no artificial colouring, specific ingredient brand…"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      {/* Event & delivery */}
      <Section title="Event & Delivery">
        <div className="grid grid-cols-2 gap-4">
          <Field label={minLeadDays ? `Event Date (min ${minLeadDays} days)` : 'Event Date'} error={errors.event_date?.message} required>
            <input {...register('event_date')} type="date" className={inputClass} style={inputStyle} />
            {watchedEventDate && isDateBlackedOut(watchedEventDate) && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                This date is blocked — unavailable for new orders.
              </p>
            )}
            {watchedEventDate && !isDateBlackedOut(watchedEventDate) && isWithinLeadTime(watchedEventDate) && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>
                Warning: this date is within the minimum lead time of {minLeadDays} days.
              </p>
            )}
          </Field>
          <Field label="Pickup / Delivery Time" error={errors.pickup_time?.message}>
            <input {...register('pickup_time')} type="time" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Delivery Type" error={errors.delivery_type?.message} required className="col-span-2">
            <div className="flex gap-3">
              {(['pickup', 'delivery'] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input {...register('delivery_type')} type="radio" value={val} className="accent-[color:var(--color-teal)]" />
                  <span className="text-sm capitalize" style={{ color: 'var(--color-ink-secondary)' }}>{val}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {deliveryType === 'delivery' && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="col-span-2 text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Delivery address (Kuwait)
            </p>
            <Field label="Governorate" required className="col-span-2">
              <select {...register('address_governorate')} className={inputClass} style={inputStyle}>
                <option value="">Select governorate</option>
                {Object.entries(GOVERNORATE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Area" required>
              <input {...register('address_area')} placeholder="Salmiya" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Block" required>
              <input {...register('address_block')} placeholder="4" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Street" required>
              <input {...register('address_street')} placeholder="Street 10" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="House / Building No." required>
              <input {...register('address_house_no')} placeholder="Villa 15" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Extra Notes" className="col-span-2">
              <input {...register('address_extra_notes')} placeholder="Ring bell twice" className={inputClass} style={inputStyle} />
            </Field>
          </div>
        )}
      </Section>

      {/* Pricing */}
      <Section title="Pricing & Payment">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (KD)" error={errors.admin_price?.message}>
            <input {...register('admin_price', { valueAsNumber: true })} type="number" step="0.001" min="0" placeholder="12.500" className={inputClass} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            {(suggestedBase !== undefined || suggestedRush !== undefined) && (
              <div className="flex gap-2 mt-1 flex-wrap">
                {suggestedBase !== undefined && (
                  <button
                    type="button"
                    onClick={() => setValue('admin_price', suggestedBase)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
                  >
                    Suggested: KD {suggestedBase.toFixed(3)}
                  </button>
                )}
                {suggestedRush !== undefined && (
                  <button
                    type="button"
                    onClick={() => setValue('admin_price', suggestedRush)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                    style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                  >
                    Rush rate: KD {suggestedRush.toFixed(3)}
                  </button>
                )}
              </div>
            )}
            {minPriceGuard !== undefined && watchedPrice !== undefined && watchedPrice !== null && !isNaN(watchedPrice as number) && (watchedPrice as number) > 0 && (watchedPrice as number) < minPriceGuard && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                Minimum price is KD {minPriceGuard.toFixed(3)}
              </p>
            )}
          </Field>
          <Field label="Advance Amount (KD)" error={errors.advance_amount?.message}>
            <input {...register('advance_amount', { valueAsNumber: true })} type="number" step="0.001" min="0" placeholder="5.000" className={inputClass} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label="Payment Method" error={errors.payment_method?.message}>
            <select {...register('payment_method')} className={inputClass} style={inputStyle}>
              <option value="">Not set</option>
              <option value="cash">Cash</option>
              <option value="wamd">WAMD</option>
            </select>
          </Field>
          <Field label="Advance Paid?" error={errors.advance_paid?.message}>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input {...register('advance_paid')} type="checkbox" className="accent-[color:var(--color-teal)] w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Mark as paid</span>
            </label>
          </Field>
          <Field label="Balance Paid?" error={(errors as any).balance_paid?.message}>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input {...register('balance_paid')} type="checkbox" className="accent-[color:var(--color-teal)] w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Balance paid in full</span>
            </label>
          </Field>
        </div>
      </Section>

      {/* Admin */}
      <Section title="Admin Notes">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority" error={errors.priority?.message}>
            <select {...register('priority', { valueAsNumber: true })} className={inputClass} style={inputStyle}>
              <option value={0}>Normal</option>
              <option value={1}>High</option>
              <option value={2}>Urgent</option>
            </select>
          </Field>
          <Field label="Internal Notes" error={errors.admin_notes?.message} className="col-span-2">
            <textarea {...register('admin_notes')} rows={3} placeholder="Notes visible only to you…" className={inputClass + ' resize-none'} style={inputStyle} />
          </Field>
        </div>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
      >
        {pending ? 'Saving…' : inquiry ? 'Save Changes' : 'Create Inquiry'}
      </button>
    </form>
  )
}

/* ---- helpers ---- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        {title}
      </p>
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
        {label}{required && <span className="ml-0.5 text-[color:var(--color-danger)]">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all'

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-cream)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-sans)',
}
