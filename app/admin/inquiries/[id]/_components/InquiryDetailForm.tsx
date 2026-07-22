'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { inquirySchema } from '@/lib/validations/inquiry'
import { updateInquiry } from '@/lib/actions/inquiries'
import { upsertCustomer } from '@/lib/actions/customers'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { Button, Checkbox, Field, Input, RadioGroup, Select, Textarea } from '@/components/ui'
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
    address_location_link: z.string().optional(),
  })
)

type FormInput = z.input<typeof fullSchema>
type FormOutput = z.output<typeof fullSchema>

interface Props {
  inquiry: Inquiry & { delivery_address?: { governorate: string; area: string; block: string; street: string; house_no: string; extra_notes?: string; location_link?: string } | null }
  options: {
    flavors: OptionRow[]
    sizes: OptionRow[]
    occasions: OptionRow[]
    items: OptionRow[]
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

const numberOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v))
// discount is never nullable in the schema (defaults to 0) — mirrors numberOrNull but
// resolves blank -> 0 instead of null.
const numberOrZero = (v: unknown) => (v === '' || v == null ? 0 : Number(v))

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
    clearErrors,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      customer_name: inquiry.customer_name,
      customer_phone: inquiry.customer_phone,
      cake_size: inquiry.cake_size,
      flavor: inquiry.flavor,
      occasion: inquiry.occasion,
      cake_type: inquiry.theme ? 'theme' : 'normal',
      theme: inquiry.theme,
      message_on_cake: inquiry.message_on_cake,
      order_type: inquiry.order_type ?? 'cake',
      item_name: inquiry.item_name ?? '',
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
      discount: inquiry.discount ? Number(inquiry.discount) : 0,
      deposit_amount: inquiry.deposit_amount ? Number(inquiry.deposit_amount) : undefined,
      fully_paid: inquiry.fully_paid,
      payment_method: inquiry.payment_method,
      admin_notes: inquiry.admin_notes,
      address_governorate: inquiry.delivery_address?.governorate ?? '',
      address_area: inquiry.delivery_address?.area ?? '',
      address_block: inquiry.delivery_address?.block ?? '',
      address_street: inquiry.delivery_address?.street ?? '',
      address_house_no: inquiry.delivery_address?.house_no ?? '',
      address_extra_notes: inquiry.delivery_address?.extra_notes ?? '',
      address_location_link: inquiry.delivery_address?.location_link ?? '',
    },
  })

  const deliveryType = watch('delivery_type')
  const cakeType = watch('cake_type')
  const orderType = watch('order_type')
  const paymentMethod = watch('payment_method')
  const watchedPhone = watch('customer_phone')
  const watchedEventDate = watch('event_date')
  const watchedCakeSize = watch('cake_size')
  const watchedPrice = watch('admin_price')
  const watchedDiscount = watch('discount')
  const watchedDeposit = watch('deposit_amount')
  const fullyPaid = watch('fully_paid')
  const locationLink = watch('address_location_link')

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

  // Live payment preview — same derivation as the DB's generated payment_status column.
  const depositAmount =
    typeof watchedDeposit === 'number' && !Number.isNaN(watchedDeposit) ? watchedDeposit : 0
  const paymentStatus = derivePaymentStatus(!!fullyPaid, depositAmount)
  const priceNum =
    typeof watchedPrice === 'number' && !Number.isNaN(watchedPrice) ? watchedPrice : null
  const discountNum =
    typeof watchedDiscount === 'number' && !Number.isNaN(watchedDiscount) ? watchedDiscount : 0
  const discountedPrice = priceNum !== null ? Math.max(0, priceNum - discountNum) : null
  const remaining = balanceOwed(discountedPrice, depositAmount, !!fullyPaid)
  const balanceFill =
    discountedPrice && discountedPrice > 0 ? Math.min(((discountedPrice - remaining) / discountedPrice) * 100, 100) : 0

  const onSubmit = (data: FormOutput) => {
    startTransition(async () => {
      const {
        address_governorate, address_area, address_block, address_street,
        address_house_no, address_extra_notes, address_location_link, ...inquiryData
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
              location_link: address_location_link,
            }
          : undefined

      const result = await updateInquiry(inquiry.id, inquiryData, addressData)

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

      toast.success('Saved')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Card 1: Customer & Contact */}
      <div
        className="rounded-xl border"
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
            <Field label="Name" error={errors.customer_name?.message} required>
              <Input
                {...register('customer_name')}
                required
                aria-invalid={errors.customer_name ? true : undefined}
              />
            </Field>
            <Field label="Phone" error={errors.customer_phone?.message} required>
              <div className="flex gap-2 items-center">
                <Input
                  {...register('customer_phone')}
                  className="flex-1 min-w-0"
                  placeholder="+965 XXXX XXXX"
                  required
                  aria-invalid={errors.customer_phone ? true : undefined}
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
                    backgroundColor: copiedPhone ? 'var(--color-teal-light)' : 'var(--color-surface-raised)',
                    color: copiedPhone ? 'var(--color-teal-deep)' : 'var(--color-ink-secondary)',
                  }}
                  title={copiedPhone ? 'Copied' : 'Copy phone'}
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
            </Field>
          </div>
        </div>
      </div>

      {/* Card 2: Cake & Event */}
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Cake
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order Type" error={errors.order_type?.message} required className="col-span-2">
              <RadioGroup
                value={orderType}
                onChange={(v) => setValue('order_type', v, { shouldDirty: true, shouldValidate: true })}
                options={[
                  { value: 'cake', label: 'Cake' },
                  { value: 'other_item', label: 'Other Item' },
                ]}
                aria-label="Order type"
              />
            </Field>
            {orderType === 'other_item' ? (
              <Field label="Size" error={errors.cake_size?.message} hint="Optional — free text">
                <Input {...register('cake_size')} placeholder="500ml, 1kg, small jar…" aria-invalid={errors.cake_size ? true : undefined} />
              </Field>
            ) : (
              <Field label="Size" error={errors.cake_size?.message} required>
                <Select {...register('cake_size')} required aria-invalid={errors.cake_size ? true : undefined}>
                  <option value="">Select size</option>
                  {options.sizes.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </Select>
              </Field>
            )}
            {orderType === 'other_item' ? (
              <Field label="Item" error={errors.item_name?.message} required>
                <Select {...register('item_name')} required aria-invalid={errors.item_name ? true : undefined}>
                  <option value="">Select item</option>
                  {options.items.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Flavor" error={errors.flavor?.message} required>
                <Select {...register('flavor')} required aria-invalid={errors.flavor ? true : undefined}>
                  <option value="">Select flavor</option>
                  {options.flavors.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </Select>
              </Field>
            )}
            {orderType === 'cake' && (
              <Field label="Occasion" error={errors.occasion?.message} className="col-span-2">
                <Select {...register('occasion')}>
                  <option value="">— Optional —</option>
                  {options.occasions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </Select>
              </Field>
            )}
            {orderType === 'cake' && (
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
            )}
            {orderType === 'cake' && cakeType === 'theme' && (
              <Field label="Theme" error={errors.theme?.message} required className="col-span-2">
                <Input
                  {...register('theme')}
                  placeholder="e.g. Butterfly garden, football, unicorn…"
                  required
                  aria-invalid={errors.theme ? true : undefined}
                />
              </Field>
            )}
            {orderType === 'cake' && (
              <Field label="Message on Cake" error={errors.message_on_cake?.message} className="col-span-2">
                <Input {...register('message_on_cake')} placeholder="Happy Birthday…" />
              </Field>
            )}
            <Field
              label="Cake Details"
              error={errors.special_requirements?.message}
              hint="Tiers, colours, decoration, toppers — everything the bake needs."
              className="col-span-2"
            >
              <Textarea {...register('special_requirements')} rows={3} placeholder="Two tiers, sage green palette, gold leaf accents…" />
            </Field>
          </div>
        </div>

        <div className="p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Dietary
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Checkbox {...register('allergen_nut_free')} label="Nut-free" />
            <Checkbox {...register('allergen_dairy_free')} label="Dairy-free" />
            <Checkbox {...register('allergen_egg_free')} label="Egg-free" />
            <Checkbox {...register('allergen_raw_sugar')} label="Raw sugar" />
          </div>
          <div className="mt-3">
            <Field label="Other dietary notes" error={errors.allergen_other?.message}>
              <Input {...register('allergen_other')} placeholder="e.g. no artificial colouring…" />
            </Field>
          </div>
        </div>

        <div className="p-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-3">
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
              <Input
                {...register('event_date')}
                type="date"
                required
                aria-invalid={errors.event_date ? true : undefined}
              />
              {errors.event_date && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.event_date.message}</p>
              )}
              {watchedEventDate && isDateBlackedOut(watchedEventDate) && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>Date is blocked</p>
              )}
              {watchedEventDate && !isDateBlackedOut(watchedEventDate) && isWithinLeadTime(watchedEventDate) && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }}>
                  Within lead time ({minLeadDays}d)
                </p>
              )}
            </div>
            <Field label={deliveryType === 'delivery' ? 'Delivery Time' : 'Pickup Time'} error={errors.pickup_time?.message}>
              <Input {...register('pickup_time')} type="time" />
            </Field>
            {deliveryType === 'delivery' && (
              <div className="col-span-2 pt-3 border-t grid grid-cols-2 gap-3" style={{ borderColor: 'var(--color-border)' }}>
                <Field label="Governorate" className="col-span-2">
                  <Select {...register('address_governorate')}>
                    <option value="">Select</option>
                    {Object.entries(GOVERNORATE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Area">
                  <Input {...register('address_area')} placeholder="Salmiya" />
                </Field>
                <Field label="Block">
                  <Input {...register('address_block')} placeholder="4" />
                </Field>
                <Field label="Street">
                  <Input {...register('address_street')} placeholder="Street 10" />
                </Field>
                <Field label="House No.">
                  <Input {...register('address_house_no')} placeholder="Villa 15" />
                </Field>
                <Field label="Extra Notes" className="col-span-2">
                  <Input {...register('address_extra_notes')} placeholder="Ring bell twice" />
                </Field>
                <Field label="Google Maps Pin" className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Input {...register('address_location_link')} placeholder="https://maps.app.goo.gl/…" className="flex-1" />
                    {locationLink && (
                      <a
                        href={locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold shrink-0"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        Open
                      </a>
                    )}
                  </div>
                </Field>
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
        <div className="p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
            Pricing & Payment
          </p>
          <div className="flex flex-col gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
                      >
                        Suggested: KD {suggestedBase.toFixed(3)}
                      </button>
                    )}
                    {suggestedRush !== undefined && (
                      <button
                        type="button"
                        onClick={() => setValue('admin_price', suggestedRush, { shouldDirty: true })}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                      >
                        Rush: KD {suggestedRush.toFixed(3)}
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
              <Field label="Deposit Amount (KD)" error={errors.deposit_amount?.message} hint="Optional, for security">
                <Input
                  {...register('deposit_amount', { setValueAs: numberOrNull })}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="5.000"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  aria-invalid={errors.deposit_amount ? true : undefined}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount (KD)" error={errors.discount?.message} hint="Flat amount off the price">
                <Input
                  {...register('discount', { setValueAs: numberOrZero })}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  aria-invalid={errors.discount ? true : undefined}
                />
              </Field>
              <Field label="Total after discount">
                <div
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink)',
                  }}
                >
                  {discountedPrice !== null ? `KD ${discountedPrice.toFixed(3)}` : '—'}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Checkbox {...register('fully_paid')} label="Fully paid" />
            </div>

            {/* Live payment status + balance bar */}
            <div
              className="rounded-lg border px-3.5 py-2.5"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
                  Payment status
                </span>
                <span className="flex items-center gap-2">
                  {paymentStatus !== 'paid' && discountedPrice !== null && discountedPrice > 0 && (
                    <span className="text-xs" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                      KD {remaining.toFixed(3)} owed
                    </span>
                  )}
                  <PaymentBadge status={paymentStatus} />
                </span>
              </div>
              {discountedPrice !== null && discountedPrice > 0 && (
                <div
                  className="mt-2 h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${paymentStatus === 'paid' ? 100 : balanceFill}%`,
                      backgroundColor: 'var(--color-teal)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4" style={{ borderColor: 'var(--color-border)' }}>
          <Field label="Admin Notes" error={errors.admin_notes?.message}>
            <Textarea {...register('admin_notes')} rows={3} placeholder="Notes visible only to you…" />
          </Field>
        </div>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Save Changes
      </Button>
    </form>
  )
}
