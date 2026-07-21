'use client'

import { useTransition, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import PhoneInput from '@/components/PhoneInput'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { inquirySchema } from '@/lib/validations/inquiry'
import { createInquiry, updateInquiry } from '@/lib/actions/inquiries'
import { lookupCustomerByPhone, upsertCustomer } from '@/lib/actions/customers'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { Button, Checkbox, Field, Input, RadioGroup, Select, Textarea } from '@/components/ui'
import type { OptionRow, Inquiry, BlackoutDate } from '@/lib/supabase/types'
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
    address_location_link: z.string().optional(),
  })
)

type FormInput = z.input<typeof fullSchema>
type FormOutput = z.output<typeof fullSchema>

interface Props {
  options: {
    flavors: OptionRow[]
    sizes: OptionRow[]
    occasions: OptionRow[]
  }
  inquiry?: Inquiry
  minLeadDays?: number
  blackouts?: BlackoutDate[]
  pricingMatrix?: Record<string, number>
  minPriceGuard?: number
  rushMultiplier?: number
}

const numberOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v))

export default function InquiryForm({ options, inquiry, minLeadDays, blackouts, pricingMatrix, minPriceGuard, rushMultiplier }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(fullSchema),
    defaultValues: inquiry
      ? {
          customer_name: inquiry.customer_name,
          customer_phone: inquiry.customer_phone,
          cake_size: inquiry.cake_size,
          flavor: inquiry.flavor,
          occasion: inquiry.occasion,
          cake_type: inquiry.theme ? 'theme' : 'normal',
          theme: inquiry.theme,
          message_on_cake: inquiry.message_on_cake,
          quantity: inquiry.quantity,
          special_requirements: inquiry.special_requirements,
          allergen_nut_free: inquiry.allergen_nut_free,
          allergen_dairy_free: inquiry.allergen_dairy_free,
          allergen_egg_free: inquiry.allergen_egg_free,
          allergen_raw_sugar: inquiry.allergen_raw_sugar,
          allergen_other: inquiry.allergen_other,
          event_date: inquiry.event_date,
          pickup_time: inquiry.pickup_time ?? undefined,
          delivery_type: inquiry.delivery_type,
          admin_price: inquiry.admin_price ? Number(inquiry.admin_price) : undefined,
          advance_amount: inquiry.advance_amount ? Number(inquiry.advance_amount) : undefined,
          advance_paid: inquiry.advance_paid,
          fully_paid: inquiry.fully_paid,
          payment_method: inquiry.payment_method,
          admin_notes: inquiry.admin_notes,
        }
      : {
          quantity: 1,
          cake_type: 'normal',
          theme: '',
          delivery_type: 'pickup',
          advance_paid: false,
          fully_paid: false,
          payment_method: '',
          allergen_nut_free: false,
          allergen_dairy_free: false,
          allergen_egg_free: false,
          allergen_raw_sugar: false,
          allergen_other: '',
        },
  })

  const deliveryType = watch('delivery_type')
  const cakeType = watch('cake_type')
  const paymentMethod = watch('payment_method')
  const watchedPhone = watch('customer_phone')
  const watchedEventDate = watch('event_date')
  const watchedCakeSize = watch('cake_size')
  const watchedPrice = watch('admin_price')
  const watchedAdvance = watch('advance_amount')
  const advancePaid = watch('advance_paid')
  const fullyPaid = watch('fully_paid')

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

  // Live payment preview — same derivation as the DB's generated payment_status column.
  const depositAmount =
    typeof watchedAdvance === 'number' && !Number.isNaN(watchedAdvance) ? watchedAdvance : 0
  const paymentStatus = derivePaymentStatus(!!fullyPaid, !!advancePaid, depositAmount)
  const priceNum =
    typeof watchedPrice === 'number' && !Number.isNaN(watchedPrice) ? watchedPrice : null
  const remaining = balanceOwed(priceNum, depositAmount, !!advancePaid, !!fullyPaid)

  const onSubmit = (data: FormOutput) => {
    startTransition(async () => {
      const { address_governorate, address_area, address_block, address_street, address_house_no, address_extra_notes, address_location_link, ...inquiryData } = data

      const addressData = deliveryType === 'delivery' && address_area
        ? {
            governorate: address_governorate,
            area: address_area,
            block: address_block,
            street: address_street,
            house_no: address_house_no,
            extra_notes: address_extra_notes,
            location_link: address_location_link,
          }
        : undefined

      const result = inquiry
        ? await updateInquiry(inquiry.id, inquiryData, addressData)
        : await createInquiry(inquiryData, addressData)

      if (result.error) {
        toast.error('Failed to save', { description: result.error })
        return
      }
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, msgs]) => {
          setError(field as keyof FormInput, { message: (msgs as string[])[0] })
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
      {/* Customer info */}
      <Section title="Customer">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" error={errors.customer_name?.message} required>
            <Input
              {...register('customer_name')}
              placeholder="Fatima Al-Ahmad"
              required
              aria-invalid={errors.customer_name ? true : undefined}
            />
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

      {/* Cake */}
      <Section title="Cake">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Size" error={errors.cake_size?.message} required>
            <Select {...register('cake_size')} required aria-invalid={errors.cake_size ? true : undefined}>
              <option value="">Select size</option>
              {options.sizes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Flavor" error={errors.flavor?.message} required>
            <Select {...register('flavor')} required aria-invalid={errors.flavor ? true : undefined}>
              <option value="">Select flavor</option>
              {options.flavors.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Occasion" error={errors.occasion?.message}>
            <Select {...register('occasion')}>
              <option value="">— Optional —</option>
              {options.occasions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Quantity" error={errors.quantity?.message} required>
            <Input
              {...register('quantity', { valueAsNumber: true })}
              type="number"
              min={1}
              max={50}
              required
              aria-invalid={errors.quantity ? true : undefined}
            />
          </Field>
          <Field label="Cake Type" error={errors.cake_type?.message} required className="col-span-2">
            <RadioGroup
              value={cakeType}
              onChange={(v) => {
                setValue('cake_type', v, { shouldDirty: true })
                if (v === 'normal') clearErrors('theme')
              }}
              options={[
                { value: 'normal', label: 'Normal cake' },
                { value: 'theme', label: 'Theme cake' },
              ]}
              aria-label="Cake type"
            />
          </Field>
          {cakeType === 'theme' && (
            <Field label="Theme" error={errors.theme?.message} required className="col-span-2">
              <Input
                {...register('theme')}
                placeholder="e.g. Butterfly garden, football, unicorn…"
                required
                aria-invalid={errors.theme ? true : undefined}
              />
            </Field>
          )}
          <Field label="Message on Cake" error={errors.message_on_cake?.message} className="col-span-2">
            <Input {...register('message_on_cake')} placeholder="Happy Birthday Sarah!" />
          </Field>
          <Field
            label="Cake Details"
            error={errors.special_requirements?.message}
            hint="Tiers, colours, decoration, toppers — everything the bake needs."
            className="col-span-2"
          >
            <Textarea {...register('special_requirements')} rows={3} placeholder="Two tiers, sage green palette, gold leaf accents…" />
          </Field>
        </div>
      </Section>

      <Section title="Dietary Requirements">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Checkbox {...register('allergen_nut_free')} label="Nut-free" />
            <Checkbox {...register('allergen_dairy_free')} label="Dairy-free" />
            <Checkbox {...register('allergen_egg_free')} label="Egg-free" />
            <Checkbox {...register('allergen_raw_sugar')} label="Raw sugar" />
          </div>
          <Field label="Other dietary notes" error={errors.allergen_other?.message}>
            <Input
              {...register('allergen_other')}
              placeholder="e.g. no artificial colouring, specific ingredient brand…"
            />
          </Field>
        </div>
      </Section>

      {/* Event & delivery */}
      <Section title="Event & Delivery">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Type" error={errors.delivery_type?.message} required className="col-span-2">
            <RadioGroup
              value={deliveryType}
              onChange={(v) => setValue('delivery_type', v, { shouldDirty: true })}
              options={[
                { value: 'pickup', label: 'Pickup' },
                { value: 'delivery', label: 'Delivery' },
              ]}
              aria-label="Delivery type"
            />
          </Field>
          <Field label={minLeadDays ? `Event Date (min ${minLeadDays} days)` : 'Event Date'} error={errors.event_date?.message} required>
            <Input
              {...register('event_date')}
              type="date"
              required
              aria-invalid={errors.event_date ? true : undefined}
            />
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
          <Field label={deliveryType === 'delivery' ? 'Delivery Time' : 'Pickup Time'} error={errors.pickup_time?.message}>
            <Input {...register('pickup_time')} type="time" />
          </Field>
        </div>

        {deliveryType === 'delivery' && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="col-span-2 text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Delivery address (Kuwait)
            </p>
            <Field label="Governorate" required className="col-span-2">
              <Select {...register('address_governorate')}>
                <option value="">Select governorate</option>
                {Object.entries(GOVERNORATE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Area" required>
              <Input {...register('address_area')} placeholder="Salmiya" />
            </Field>
            <Field label="Block" required>
              <Input {...register('address_block')} placeholder="4" />
            </Field>
            <Field label="Street" required>
              <Input {...register('address_street')} placeholder="Street 10" />
            </Field>
            <Field label="House / Building No." required>
              <Input {...register('address_house_no')} placeholder="Villa 15" />
            </Field>
            <Field label="Extra Notes" className="col-span-2">
              <Input {...register('address_extra_notes')} placeholder="Ring bell twice" />
            </Field>
            <Field label="Google Maps Pin" className="col-span-2">
              <Input {...register('address_location_link')} placeholder="https://maps.app.goo.gl/…" />
            </Field>
          </div>
        )}
      </Section>

      {/* Pricing & payment */}
      <Section title="Pricing & Payment">
        <div className="flex flex-col gap-4">
          <Field label="Payment Method" error={errors.payment_method?.message}>
            <RadioGroup
              value={paymentMethod ?? ''}
              onChange={(v) => setValue('payment_method', v, { shouldDirty: true })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'wamd', label: 'WAMD' },
              ]}
              aria-label="Payment method"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (KD)" error={errors.admin_price?.message}>
              <Input
                {...register('admin_price', { setValueAs: numberOrNull })}
                type="number"
                step="0.001"
                min="0"
                placeholder="12.500"
                style={{ fontFamily: 'var(--font-mono)' }}
                aria-invalid={errors.admin_price ? true : undefined}
              />
              {(suggestedBase !== undefined || suggestedRush !== undefined) && (
                <div className="flex gap-2 mt-1 flex-wrap">
                  {suggestedBase !== undefined && (
                    <button
                      type="button"
                      onClick={() => setValue('admin_price', suggestedBase, { shouldDirty: true })}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
                    >
                      Suggested: KD {suggestedBase.toFixed(3)}
                    </button>
                  )}
                  {suggestedRush !== undefined && (
                    <button
                      type="button"
                      onClick={() => setValue('admin_price', suggestedRush, { shouldDirty: true })}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                    >
                      Rush rate: KD {suggestedRush.toFixed(3)}
                    </button>
                  )}
                </div>
              )}
              {minPriceGuard !== undefined && priceNum !== null && priceNum > 0 && priceNum < minPriceGuard && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                  Minimum price is KD {minPriceGuard.toFixed(3)}
                </p>
              )}
            </Field>
            <Field label="Deposit Amount (KD)" error={errors.advance_amount?.message} hint="Optional, for security">
              <Input
                {...register('advance_amount', { setValueAs: numberOrNull })}
                type="number"
                step="0.001"
                min="0"
                placeholder="5.000"
                style={{ fontFamily: 'var(--font-mono)' }}
                aria-invalid={errors.advance_amount ? true : undefined}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {depositAmount > 0 && (
              <Checkbox {...register('advance_paid')} label="Deposit received" />
            )}
            <Checkbox {...register('fully_paid')} label="Fully paid" />
          </div>
          <div
            className="flex items-center justify-between rounded-lg border px-3.5 py-2.5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Payment status
            </span>
            <span className="flex items-center gap-2">
              {paymentStatus !== 'paid' && priceNum !== null && priceNum > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  KD {remaining.toFixed(3)} owed
                </span>
              )}
              <PaymentBadge status={paymentStatus} />
            </span>
          </div>
        </div>
      </Section>

      {/* Admin */}
      <Section title="Admin Notes">
        <Field label="Internal Notes" error={errors.admin_notes?.message}>
          <Textarea {...register('admin_notes')} rows={3} placeholder="Notes visible only to you…" />
        </Field>
      </Section>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {inquiry ? 'Save Changes' : 'Create Inquiry'}
      </Button>
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
