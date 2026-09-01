'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import PhoneInput from '@/components/PhoneInput'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART } from '@/lib/motion'
import { inquirySchema } from '@/lib/validations/inquiry'
import { createInquiry, updateInquiry } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { lookupCustomerByPhone, searchCustomersByName, upsertCustomer, type CustomerWithHistory } from '@/lib/actions/customers'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { PaymentBadge } from '@/components/admin/StatusBadge'
import { PinnedOrderTotal } from '@/components/admin/PinnedOrderTotal'
import { Button, Checkbox, Field, Input, RadioGroup, Select, Switch, Textarea } from '@/components/ui'
import { Plus } from '@phosphor-icons/react'
import type { OptionRow, Inquiry, BlackoutDate } from '@/lib/supabase/types'
import { z } from 'zod'
import { GOVERNORATE_LABELS } from '@/lib/utils'
import { CustomerHistoryPanel, type PrefillItem } from './CustomerHistoryPanel'
import { ItemFields, defaultItem } from './ItemFields'
import ReferencePhotoUpload, { type ReferenceImage } from '@/components/ReferencePhotoUpload'

type MatchState = 'pending' | 'selected' | 'new'

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
  // "Repeat this order" entry point (order detail page / customer profile ->
  // /admin/orders/new?from=<inquiryId>). Create-mode only (ignored when `inquiry` is set).
  // Seeds customer_name/phone + items via defaultValues; the existing phone-lookup effect
  // below then finds and offers to link the matching customer record same as manual entry.
  prefillFrom?: {
    customer_name: string
    customer_phone: string
    items: PrefillItem[]
  }
}

const numberOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v))
// discount is never nullable in the schema (defaults to 0) — mirrors numberOrNull but
// resolves blank -> 0 instead of null.
const numberOrZero = (v: unknown) => (v === '' || v == null ? 0 : Number(v))

export default function InquiryForm({ options, inquiry, minLeadDays, blackouts, pricingMatrix, minPriceGuard, rushMultiplier, prefillFrom }: Props) {
  const router = useRouter()
  const ledgerRef = useRef<HTMLDivElement>(null)
  // Holds the id of a freshly-created inquiry so the hook's `onSuccess` (which runs after
  // `pending` clears) knows where to navigate. Ref, not state — setting it never re-renders.
  const createdIdRef = useRef<string | null>(null)
  // Staged pre-inquiry (no inquiry_id to attach to yet, same reasoning as the customer
  // /order form) — attached as inquiry_images once createInquiry returns a real id.
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])

  // Item catalog ("Other Item" dropdown) — kept here, shared across every item row, so a new
  // option created from any one row is instantly visible in every row's dropdown.
  const [itemOptions, setItemOptions] = useState<OptionRow[]>(options.items)

  useEffect(() => {
    setItemOptions(options.items)
  }, [options.items])

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(fullSchema),
    defaultValues: inquiry
      ? {
          customer_name: inquiry.customer_name,
          customer_phone: inquiry.customer_phone,
          items: inquiry.items?.length
            ? [...inquiry.items]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => ({
                  cake_size: item.cake_size,
                  flavor: item.flavor,
                  occasion: item.occasion,
                  cake_type: item.theme ? 'theme' as const : 'normal' as const,
                  theme: item.theme,
                  message_on_cake: item.message_on_cake,
                  quantity: item.quantity,
                  special_requirements: item.special_requirements,
                  order_type: item.order_type,
                  item_name: item.item_name,
                }))
            : [
                {
                  cake_size: inquiry.cake_size,
                  flavor: inquiry.flavor,
                  occasion: inquiry.occasion,
                  cake_type: inquiry.theme ? 'theme' as const : 'normal' as const,
                  theme: inquiry.theme,
                  message_on_cake: inquiry.message_on_cake,
                  order_type: inquiry.order_type ?? 'cake',
                  item_name: inquiry.item_name ?? '',
                  quantity: inquiry.quantity,
                  special_requirements: inquiry.special_requirements,
                },
              ],
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
          delivery_charge: inquiry.delivery_charge ? Number(inquiry.delivery_charge) : 0,
          deposit_amount: inquiry.deposit_amount ? Number(inquiry.deposit_amount) : undefined,
          fully_paid: inquiry.fully_paid,
          payment_method: inquiry.payment_method,
          admin_notes: inquiry.admin_notes,
        }
      : {
          customer_name: prefillFrom?.customer_name,
          customer_phone: prefillFrom?.customer_phone,
          items: prefillFrom?.items?.length ? prefillFrom.items : [defaultItem()],
          delivery_type: 'pickup',
          discount: 0,
          delivery_charge: 0,
          fully_paid: false,
          payment_method: '',
          allergen_nut_free: false,
          allergen_dairy_free: false,
          allergen_egg_free: false,
          allergen_raw_sugar: false,
          allergen_other: '',
        },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    formState: { errors },
  } = form

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' })

  const deliveryType = watch('delivery_type')
  const paymentMethod = watch('payment_method')
  const watchedPhone = watch('customer_phone')
  const watchedCustomerName = watch('customer_name')
  const watchedEventDate = watch('event_date')
  // Suggested pricing is keyed off a single size — pricing stays order-level (no per-item
  // pricing UI in this pass, see the multi-item plan), so this reads the first item's size
  // as the representative one for a multi-item order.
  const watchedCakeSize = watch('items.0.cake_size')
  const watchedPrice = watch('admin_price')
  const watchedDiscount = watch('discount')
  const watchedDeliveryCharge = watch('delivery_charge')
  const fullyPaid = watch('fully_paid')
  const reduceMotion = useReducedMotion()

  const [showDietary, setShowDietary] = useState(() =>
    !!(inquiry && (
      inquiry.allergen_nut_free ||
      inquiry.allergen_dairy_free ||
      inquiry.allergen_egg_free ||
      inquiry.allergen_raw_sugar ||
      inquiry.allergen_other
    ))
  )

  const [customerHistory, setCustomerHistory] = useState<CustomerWithHistory | null>(null)
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

  // Name-based search — the phone effect above only ever resolves an exact phone match,
  // which doesn't help when the admin starts typing a customer's name instead. Only runs
  // while the phone field isn't itself already close to a full number, so the two searches
  // don't fight over which one drives the panel.
  const [nameMatches, setNameMatches] = useState<{ id: string; name: string; phone: string; vip: boolean }[]>([])

  useEffect(() => {
    const trimmedName = watchedCustomerName?.trim() ?? ''
    const trimmedPhone = watchedPhone?.trim() ?? ''

    if (matchState === 'selected' || trimmedPhone.length >= 7 || trimmedName.length < 2) {
      setNameMatches([])
      return
    }
    const timer = setTimeout(async () => {
      const result = await searchCustomersByName(trimmedName)
      setNameMatches(result.data ?? [])
    }, 400)
    return () => clearTimeout(timer)
  }, [watchedCustomerName, watchedPhone, matchState])

  const handleSelectNameMatch = (match: { id: string; name: string; phone: string }) => {
    // Reuses the phone-lookup effect above to populate customerHistory and show the
    // existing "Use this customer / someone else" panel — same confirmation step as
    // typing a phone directly, just reached from the name field instead.
    setValue('customer_name', match.name, { shouldValidate: true })
    setValue('customer_phone', match.phone, { shouldValidate: true })
    setNameMatches([])
  }

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

  const isDateBlackedOut = (date: string): boolean => {
    if (!date || !blackouts?.length) return false
    const d = new Date(date)
    return blackouts.some((b) => new Date(b.date_from) <= d && d <= new Date(b.date_to))
  }

  // cake_size is stored as the size name; pricing is keyed by size id, so
  // resolve name -> id before the base-price lookup.
  const suggestedBase = (() => {
    if (!pricingMatrix || !watchedCakeSize) return undefined
    const sizeId = options.sizes.find((s) => s.name === watchedCakeSize)?.id
    return sizeId ? pricingMatrix[sizeId] : undefined
  })()
  const isRush = suggestedBase !== undefined && watchedEventDate ? (() => {
    const d = new Date(watchedEventDate)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + (minLeadDays ?? 3) + 2)
    return d < cutoff
  })() : false
  const suggestedRush = isRush && rushMultiplier && suggestedBase ? suggestedBase * rushMultiplier : undefined

  const priceNum =
    typeof watchedPrice === 'number' && !Number.isNaN(watchedPrice) ? watchedPrice : null
  const discountNum =
    typeof watchedDiscount === 'number' && !Number.isNaN(watchedDiscount) ? watchedDiscount : 0
  const deliveryChargeNum =
    typeof watchedDeliveryCharge === 'number' && !Number.isNaN(watchedDeliveryCharge) ? watchedDeliveryCharge : 0
  const orderTotalAmt =
    priceNum !== null ? Math.max(0, priceNum - discountNum) + deliveryChargeNum : null

  // Payment status + balance are DERIVED from the payments ledger, never entered here.
  // `paidAmt` is read-only: it comes from inquiry.amount_paid (trigger-summed from
  // `payments`), 0 on the brand-new-inquiry path. `fully_paid` is the manual settle
  // override for a comped/rounded remainder — see lib/payments.ts.
  const paidAmt = Number(inquiry?.amount_paid ?? 0)
  const paymentStatus = derivePaymentStatus(paidAmt, orderTotalAmt, !!fullyPaid)
  const balanceAmt =
    orderTotalAmt !== null ? balanceOwed(orderTotalAmt, paidAmt, !!fullyPaid) : null

  // Delivery charge only makes sense on a delivery order — clear a stale charge (and say
  // so) the moment an admin flips an order from Delivery back to Pickup, rather than
  // leaving a hidden number that would otherwise fail the pickup=0 DB check on save.
  const prevDeliveryType = useRef(deliveryType)
  useEffect(() => {
    if (prevDeliveryType.current === 'delivery' && deliveryType === 'pickup' && watchedDeliveryCharge) {
      setValue('delivery_charge', 0, { shouldDirty: true })
      toast.info('Delivery charge cleared — this order is now pickup')
    }
    prevDeliveryType.current = deliveryType
  }, [deliveryType])

  const { run: submit, pending } = useAsyncAction(
    async (data: FormOutput) => {
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
            description: upsertResult.error ?? 'Order will be saved without a customer link.',
          })
          customerId = null
        } else {
          customerId = upsertResult.data.id
        }
      }

      const payload = { ...inquiryData, customer_id: customerId }

      const result = inquiry
        ? await updateInquiry(inquiry.id, payload, addressData)
        : await createInquiry(payload, addressData, referenceImages)

      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, msgs]) => {
          setError(field as keyof FormInput, { message: (msgs as string[])[0] })
        })
        return false // form now shows the field errors — no toast
      }
      if (result.error) {
        toast.error('Failed to save', { description: result.error })
        return false
      }

      createdIdRef.current = inquiry ? null : result.data!.id
    },
    {
      successToast: inquiry ? 'Changes saved' : 'Order created',
      // Navigation lives here so it runs *after* `pending` clears — router.push inside the
      // write transition would pin the submit spinner through the destination's full
      // server re-render (~11 queries). The edit case pushes to the route it's already on
      // (a no-op navigation), so it also needs an explicit refresh to refetch.
      onSuccess: () => {
        router.push(inquiry ? `/admin/orders/${inquiry.id}` : `/admin/orders/${createdIdRef.current}`)
        if (inquiry) router.refresh()
      },
    }
  )

  const onInvalid = () => {
    toast.error('Check the highlighted fields')
    // Two frames: let RHF's error state commit (so aria-invalid lands in the DOM), then read.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
        el?.focus({ preventScroll: true })
      })
    )
  }

  return (
    <FormProvider {...form}>
    {/* pb-20: clearance for PinnedOrderTotal, which can cover the last ~2-3 fields
        (and the submit button) once the ledger above has scrolled out of view. */}
    <form onSubmit={handleSubmit(submit, onInvalid)} className="flex flex-col gap-8 pb-20">
      {/* Customer info */}
      <Section title="Customer">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        {nameMatches.length > 0 && (
          <div
            className="rounded-xl border mt-2 overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {nameMatches.map((match, i) => (
              <button
                key={match.id}
                type="button"
                onClick={() => handleSelectNameMatch(match)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                    {match.name}
                  </span>
                  {match.vip && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                      VIP
                    </span>
                  )}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  {match.phone}
                </span>
              </button>
            ))}
          </div>
        )}
        {customerHistory && (
          <CustomerHistoryPanel
            data={customerHistory}
            matchState={matchState}
            onUseExisting={handleUseExisting}
            onNewCustomer={handleNewCustomer}
            onPrefill={(items) => {
              replace(
                items.map((item) => ({
                  cake_size: item.cake_size,
                  flavor: item.flavor,
                  occasion: item.occasion,
                  cake_type: item.theme ? ('theme' as const) : ('normal' as const),
                  theme: item.theme,
                  message_on_cake: item.message_on_cake,
                  quantity: item.quantity,
                  special_requirements: item.special_requirements,
                  order_type: item.order_type,
                  item_name: item.item_name,
                }))
              )
            }}
          />
        )}
      </Section>

      {/* Cake — one repeatable block per item (see supabase/migrations/034_multi_item_
          inquiries.sql). A single item renders with no extra chrome, matching the original
          single-item form exactly; a second+ item adds an "Item N" label and remove button. */}
      <Section title="Cake">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
              className="overflow-hidden"
            >
              <ItemFields
                index={index}
                options={{ flavors: options.flavors, sizes: options.sizes, occasions: options.occasions }}
                itemOptions={itemOptions}
                onItemOptionCreated={(opt) =>
                  setItemOptions((prev) => [...prev, opt].sort((a, b) => a.name.localeCompare(b.name)))
                }
                showChrome={fields.length > 1}
                onRemove={() => remove(index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => append(defaultItem())}
          className="flex items-center justify-center gap-2 text-sm rounded-lg border-2 border-dashed px-3 w-full transition-colors hover:border-[color:var(--color-border-strong)] mt-4"
          style={{ minHeight: 44, borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
        >
          <Plus size={16} weight="bold" />
          <span>Add another item</span>
        </button>
      </Section>

      <Section title="Dietary Requirements">
        <Checkbox
          checked={showDietary}
          onChange={(e) => {
            const checked = e.target.checked
            setShowDietary(checked)
            if (!checked) {
              setValue('allergen_nut_free', false, { shouldDirty: true })
              setValue('allergen_dairy_free', false, { shouldDirty: true })
              setValue('allergen_egg_free', false, { shouldDirty: true })
              setValue('allergen_raw_sugar', false, { shouldDirty: true })
              setValue('allergen_other', '', { shouldDirty: true })
            }
          }}
          label="This order has dietary requirements"
        />
        <AnimatePresence initial={false}>
          {showDietary && (
            <motion.div
              key="dietary-fields"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 pt-3">
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
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* Event & delivery */}
      <Section title="Event & Delivery">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Delivery Type" error={errors.delivery_type?.message} required className="sm:col-span-2">
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
          <Field label="Event Date" error={errors.event_date?.message} required>
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
          </Field>
          <Field label={deliveryType === 'delivery' ? 'Delivery Time' : 'Pickup Time'} error={errors.pickup_time?.message}>
            <Input {...register('pickup_time')} type="time" step={900} />
          </Field>
        </div>

        {deliveryType === 'delivery' && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="sm:col-span-2 text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Delivery address (Kuwait)
            </p>
            <Field label="Governorate" required className="sm:col-span-2">
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
            <Field label="Extra Notes" className="sm:col-span-2">
              <Input {...register('address_extra_notes')} placeholder="Ring bell twice" />
            </Field>
            <Field label="Google Maps Pin" className="sm:col-span-2">
              <Input {...register('address_location_link')} placeholder="https://maps.app.goo.gl/…" />
            </Field>
            <div className="sm:col-span-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <Field
                label="Delivery Charge (KD)"
                error={errors.delivery_charge?.message}
                hint="Added to the order total below. Leave at 0 for free delivery."
              >
                <Input
                  {...register('delivery_charge', { setValueAs: numberOrZero })}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  prefix="+"
                  aria-invalid={errors.delivery_charge ? true : undefined}
                />
              </Field>
            </div>
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
          <Field label="Price (KD)" error={errors.admin_price?.message}>
            <Input
              {...register('admin_price', { setValueAs: numberOrNull })}
              type="number"
              step="0.001"
              min="0"
              prefix="KD"
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

          <Field label="Discount (KD)" error={errors.discount?.message} hint="Flat amount off the price">
            <Input
              {...register('discount', { setValueAs: numberOrZero })}
              type="number"
              step="0.001"
              min="0"
              placeholder="0.000"
              prefix="−"
              prefixTone="minus"
              aria-invalid={errors.discount ? true : undefined}
            />
          </Field>

          {/* Order total — the one place every pricing figure resolves. The delivery
              line is entered in Event & Delivery above, not here, but still counts
              toward this total. */}
          <div
            ref={ledgerRef}
            className="rounded-lg border px-3.5 py-3 flex flex-col gap-1.5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-ink-muted)' }}>Price</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                {priceNum !== null ? priceNum.toFixed(3) : '—'}
              </span>
            </div>
            {discountNum > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-ink-muted)' }}>Discount</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>
                  − {discountNum.toFixed(3)}
                </span>
              </div>
            )}
            {deliveryType === 'delivery' && deliveryChargeNum > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-ink-muted)' }}>
                  Delivery <span className="text-xs">· set above</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                  + {deliveryChargeNum.toFixed(3)}
                </span>
              </div>
            )}
            <div
              className="pt-1.5 mt-0.5 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Order total
              </span>
              <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                {orderTotalAmt !== null ? `KD ${orderTotalAmt.toFixed(3)}` : '—'}
              </span>
            </div>
            {deliveryType === 'delivery' && deliveryChargeNum === 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-warning)' }}>
                This is a delivery order with no delivery charge set. Add one in Event &amp; Delivery above, or leave it if delivery is free.
              </p>
            )}
          </div>

          {/* Payment — status and balance are DERIVED from the payments ledger, never
              entered on this form. This strip is read-only; money is recorded against
              the order, and `fully_paid` below only writes off a leftover balance. */}
          <div
            className="rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <div className="px-3.5 py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-ink-muted)' }}>Order total</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                  {orderTotalAmt !== null ? `KD ${orderTotalAmt.toFixed(3)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-ink-muted)' }}>Paid</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                  KD {paidAmt.toFixed(3)}
                </span>
              </div>
              <div
                className="pt-1.5 mt-0.5 border-t flex items-center justify-between gap-2"
                style={{ borderColor: 'var(--color-border-strong)' }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                  {fullyPaid ? 'Settled' : 'Balance'}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                    {balanceAmt !== null ? `KD ${balanceAmt.toFixed(3)}` : '—'}
                  </span>
                  <PaymentBadge status={paymentStatus} />
                </span>
              </div>
            </div>

            <div
              className="px-3.5 py-3 border-t flex flex-col gap-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Switch
                label="Mark settled"
                description="Settle a small leftover balance (comps, rounding). It does not mean the customer has paid."
                checked={!!fullyPaid}
                onChange={(e) => setValue('fully_paid', e.target.checked, { shouldDirty: true })}
              />
              <div
                className="flex items-center justify-between gap-3 pt-3 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  Payments are recorded from the order&apos;s payment history.
                </p>
                {/* TODO Phase 2: open <RecordPaymentSheet/> */}
                <Button type="button" variant="secondary" size="sm" disabled className="shrink-0">
                  Record payment
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Field
              label="Security Deposit (KD)"
              error={errors.deposit_amount?.message}
              hint="Collateral, refunded after the event. Not part of the total or the balance."
              className="mt-3"
            >
              <Input
                {...register('deposit_amount', { setValueAs: numberOrNull })}
                type="number"
                step="0.001"
                min="0"
                prefix="KD"
                aria-invalid={errors.deposit_amount ? true : undefined}
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* Admin */}
      <Section title="Admin Notes">
        <Field label="Internal Notes" error={errors.admin_notes?.message}>
          <Textarea {...register('admin_notes')} rows={3} placeholder="Notes visible only to you…" />
        </Field>
      </Section>

      {/* Reference photos — create flow only; an existing inquiry already has its own
          image section (ImageGallery, wired to the real inquiry_id) on the detail page.
          Placed directly above the submit button per feedback that it was easy to miss
          buried earlier in the form. */}
      {!inquiry && (
        <Section title="Reference Photos">
          <ReferencePhotoUpload images={referenceImages} onChange={setReferenceImages} endpoint="/api/upload" />
        </Section>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? (inquiry ? 'Saving…' : 'Creating…') : (inquiry ? 'Save Changes' : 'Create Order')}
      </Button>

      <PinnedOrderTotal anchorRef={ledgerRef} total={orderTotalAmt} />
    </form>
    </FormProvider>
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
