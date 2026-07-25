'use client'

import { useTransition, useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import PhoneInput from '@/components/PhoneInput'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART } from '@/lib/motion'
import { inquirySchema } from '@/lib/validations/inquiry'
import { createInquiry, updateInquiry } from '@/lib/actions/inquiries'
import { lookupCustomerByPhone, upsertCustomer } from '@/lib/actions/customers'
import { createOption } from '@/lib/actions/options'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { Button, Checkbox, Field, Input, RadioGroup, Select, Spinner, Textarea } from '@/components/ui'
import { Check, X } from '@phosphor-icons/react'
import type { OptionRow, Inquiry, BlackoutDate } from '@/lib/supabase/types'
import { z } from 'zod'
import { GOVERNORATE_LABELS } from '@/lib/utils'
import { CustomerHistoryPanel } from './CustomerHistoryPanel'

type MatchState = 'pending' | 'selected' | 'new'

// Sentinel value for the "+ Add new item" entry appended to the item <Select>.
// Never a real option — intercepted in the onChange handler before it reaches form state.
const NEW_ITEM_OPTION = '__add_new_item__'

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
    items: OptionRow[]
  }
  inquiry?: Inquiry
  minLeadDays?: number
  blackouts?: BlackoutDate[]
  pricingMatrix?: Record<string, number>
  minPriceGuard?: number
  rushMultiplier?: number
}

const numberOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v))
// discount is never nullable in the schema (defaults to 0) — mirrors numberOrNull but
// resolves blank -> 0 instead of null.
const numberOrZero = (v: unknown) => (v === '' || v == null ? 0 : Number(v))

export default function InquiryForm({ options, inquiry, minLeadDays, blackouts, pricingMatrix, minPriceGuard, rushMultiplier }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Inline "add new item" affordance for the Item dropdown (Other Item order type).
  const [itemOptions, setItemOptions] = useState<OptionRow[]>(options.items)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [itemError, setItemError] = useState<string | null>(null)
  const [itemPending, setItemPending] = useState(false)
  const itemSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setItemOptions(options.items)
  }, [options.items])

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
          amount_paid: inquiry.amount_paid ? Number(inquiry.amount_paid) : undefined,
          fully_paid: inquiry.fully_paid,
          payment_choice: derivePaymentStatus(inquiry.fully_paid, inquiry.amount_paid),
          payment_method: inquiry.payment_method,
          admin_notes: inquiry.admin_notes,
        }
      : {
          quantity: 1,
          cake_type: 'normal',
          theme: '',
          order_type: 'cake',
          item_name: '',
          delivery_type: 'pickup',
          discount: 0,
          fully_paid: false,
          payment_choice: 'unpaid',
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
  const orderType = watch('order_type')
  const paymentMethod = watch('payment_method')
  const watchedPhone = watch('customer_phone')
  const watchedEventDate = watch('event_date')
  const watchedCakeSize = watch('cake_size')
  const watchedPrice = watch('admin_price')
  const watchedDiscount = watch('discount')
  const watchedAmountPaid = watch('amount_paid')
  const fullyPaid = watch('fully_paid')
  const paymentChoice = watch('payment_choice')
  const watchedItemName = watch('item_name')
  const reduceMotion = useReducedMotion()

  const cancelAddItem = () => {
    setIsAddingItem(false)
    setNewItemName('')
    setItemError(null)
  }

  const handleCreateItem = async () => {
    const trimmed = newItemName.trim()
    if (!trimmed || itemPending) return
    setItemPending(true)
    setItemError(null)
    const result = await createOption('item_options', {
      name: trimmed,
      sort_order: itemOptions.length,
      is_active: true,
    })
    setItemPending(false)
    if (result.error !== null) {
      setItemError(result.error)
      return
    }
    if (result.fieldErrors !== null) {
      setItemError(result.fieldErrors.name?.[0] ?? 'Could not add item')
      return
    }
    const created = result.data
    setItemOptions((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setValue('item_name', created.name, { shouldDirty: true, shouldValidate: true })
    setIsAddingItem(false)
    setNewItemName('')
    toast.success('Item added')
    requestAnimationFrame(() => itemSelectRef.current?.focus())
  }

  const [customerHistory, setCustomerHistory] = useState<{
    customer: { id: string; name: string; notes: string; vip: boolean; phone: string; created_at: string; updated_at: string }
    recentInquiries: Array<{ id: string; cake_size: string; flavor: string; event_date: string; status: string; order_type?: string; item_name?: string }>
    totalCount: number
  } | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [matchState, setMatchState] = useState<MatchState>('pending')

  useEffect(() => {
    // A stale "use this customer / new customer" decision must never survive a phone edit —
    // reset both synchronously (before the lookup even debounces) whenever the phone changes.
    setSelectedCustomerId(null)
    setMatchState('pending')

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

  const handleUseExisting = () => {
    if (!customerHistory) return
    setValue('customer_name', customerHistory.customer.name, { shouldValidate: true })
    setSelectedCustomerId(customerHistory.customer.id)
    setMatchState('selected')
  }

  const handleNewCustomer = () => {
    setSelectedCustomerId(null)
    setMatchState('new')
  }

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
  // Driven by amount_paid, the only figure credited against the price; deposit_amount is
  // collateral, held/returned/forfeited, and intentionally excluded — see lib/payments.ts.
  const amountPaidNum =
    typeof watchedAmountPaid === 'number' && !Number.isNaN(watchedAmountPaid) ? watchedAmountPaid : 0
  const paymentStatus = derivePaymentStatus(!!fullyPaid, amountPaidNum)
  const priceNum =
    typeof watchedPrice === 'number' && !Number.isNaN(watchedPrice) ? watchedPrice : null
  const discountNum =
    typeof watchedDiscount === 'number' && !Number.isNaN(watchedDiscount) ? watchedDiscount : 0
  const discountedPrice = priceNum !== null ? Math.max(0, priceNum - discountNum) : null
  const remaining = balanceOwed(discountedPrice, amountPaidNum, !!fullyPaid)

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

      // Resolve the customer link BEFORE creating/updating the inquiry — an explicit
      // "use this customer" selection wins, otherwise fall back to an upsert-by-phone
      // (awaited, not fire-and-forget) so every admin-created inquiry ends up linked.
      let customerId: string | null = selectedCustomerId
      if (!customerId && inquiryData.customer_phone && inquiryData.customer_name) {
        const upsertResult = await upsertCustomer(inquiryData.customer_phone, inquiryData.customer_name)
        if (upsertResult.error || !upsertResult.data) {
          toast.warning('Could not link customer record', {
            description: upsertResult.error ?? 'Inquiry will be saved without a customer link.',
          })
          customerId = null
        } else {
          customerId = upsertResult.data.id
        }
      }

      const payload = { ...inquiryData, customer_id: customerId }

      const result = inquiry
        ? await updateInquiry(inquiry.id, payload, addressData)
        : await createInquiry(payload, addressData)

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
            matchState={matchState}
            onUseExisting={handleUseExisting}
            onNewCustomer={handleNewCustomer}
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
                {options.sizes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </Select>
            </Field>
          )}
          {orderType === 'other_item' ? (
            <Field label="Item" error={errors.item_name?.message} required>
              <Select
                ref={itemSelectRef}
                value={isAddingItem ? NEW_ITEM_OPTION : watchedItemName ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === NEW_ITEM_OPTION) {
                    setIsAddingItem(true)
                    setItemError(null)
                    return
                  }
                  setIsAddingItem(false)
                  setNewItemName('')
                  setItemError(null)
                  setValue('item_name', val, { shouldDirty: true, shouldValidate: true })
                }}
                required
                aria-invalid={errors.item_name ? true : undefined}
              >
                <option value="">Select item</option>
                {itemOptions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                <option value={NEW_ITEM_OPTION}>+ Add new item…</option>
              </Select>
              {isAddingItem && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      autoFocus
                      value={newItemName}
                      onChange={(e) => {
                        setNewItemName(e.target.value)
                        setItemError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleCreateItem()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelAddItem()
                        }
                      }}
                      placeholder="New item name…"
                      disabled={itemPending}
                      aria-invalid={itemError ? true : undefined}
                    />
                    {itemError && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{itemError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateItem()}
                    disabled={itemPending || !newItemName.trim()}
                    className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-teal-light)',
                      color: 'var(--color-teal-deep)',
                    }}
                    title="Add item"
                  >
                    {itemPending ? <Spinner size={14} /> : <Check size={14} weight="bold" />}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddItem}
                    disabled={itemPending}
                    className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-surface-raised)',
                      color: 'var(--color-ink-secondary)',
                    }}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </Field>
          ) : (
            <Field label="Flavor" error={errors.flavor?.message} required>
              <Select {...register('flavor')} required aria-invalid={errors.flavor ? true : undefined}>
                <option value="">Select flavor</option>
                {options.flavors.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </Select>
            </Field>
          )}
          {orderType === 'cake' && (
            <Field label="Occasion" error={errors.occasion?.message}>
              <Select {...register('occasion')}>
                <option value="">— Optional —</option>
                {options.occasions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </Select>
            </Field>
          )}
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
                required
                aria-invalid={errors.theme ? true : undefined}
              />
            </Field>
          )}
          {orderType === 'cake' && (
          <Field label="Message on Cake" error={errors.message_on_cake?.message} className="col-span-2">
            <Input {...register('message_on_cake')} />
          </Field>
          )}
          <Field
            label="Cake Details"
            error={errors.special_requirements?.message}
            className="col-span-2"
          >
            <Textarea
              {...register('special_requirements')}
              rows={3}
              placeholder="Tiers, colours, decoration, toppers — everything the bake needs."
            />
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
            <Field
              label="Security Deposit (KD)"
              error={errors.deposit_amount?.message}
              hint="Held as collateral — not counted toward balance"
            >
              <Input
                {...register('deposit_amount', { setValueAs: numberOrNull })}
                type="number"
                step="0.001"
                min="0"
                style={{ fontFamily: 'var(--font-mono)' }}
                aria-invalid={errors.deposit_amount ? true : undefined}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
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

          <Field label="Payment Status" required>
            <RadioGroup
              value={paymentChoice}
              onChange={(v) => {
                setValue('payment_choice', v, { shouldDirty: true, shouldValidate: true })
                if (v === 'unpaid') {
                  setValue('fully_paid', false, { shouldDirty: true })
                  setValue('amount_paid', null, { shouldDirty: true, shouldValidate: true })
                  clearErrors('amount_paid')
                } else if (v === 'partial') {
                  setValue('fully_paid', false, { shouldDirty: true })
                } else if (v === 'paid') {
                  setValue('fully_paid', true, { shouldDirty: true })
                  setValue('amount_paid', null, { shouldDirty: true, shouldValidate: true })
                  clearErrors('amount_paid')
                }
              }}
              options={[
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Partial' },
                { value: 'paid', label: 'Paid' },
              ]}
              aria-label="Payment status"
            />
          </Field>
          <AnimatePresence initial={false}>
            {paymentChoice === 'partial' && (
              <motion.div
                key="amount-paid"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
              >
                <Field
                  label="Amount Paid (KD)"
                  error={errors.amount_paid?.message}
                  hint="How much the customer has paid so far"
                  required
                >
                  <Input
                    {...register('amount_paid', { setValueAs: numberOrNull })}
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    autoFocus
                    style={{ fontFamily: 'var(--font-mono)' }}
                    aria-invalid={errors.amount_paid ? true : undefined}
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            className="flex items-center justify-between rounded-lg border px-3.5 py-2.5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
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
