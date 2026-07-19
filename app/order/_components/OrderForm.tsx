'use client'
import { useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART } from '@/lib/motion'
import PhoneInput from '@/components/PhoneInput'
import {
  publicInquirySchema,
  type PublicInquiryInput,
  type PublicInquiryData,
} from '@/lib/validations/publicInquiry'
import { Button, Checkbox, Field, Input, RadioGroup, Select, Textarea } from '@/components/ui'

interface Option { id: string; name: string }
interface Blackout { id: string; date_from: string; date_to: string; reason: string }
interface Props {
  flavors: Option[]
  sizes: Option[]
  occasions: Option[]
  blackouts: Blackout[]
  minLeadDays: number
}

function isDateBlackedOut(date: string, blackouts: Blackout[]): boolean {
  if (!date) return false
  const d = new Date(date)
  return blackouts.some(b => new Date(b.date_from) <= d && d <= new Date(b.date_to))
}

function getMinDate(minLeadDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + minLeadDays)
  return d.toISOString().split('T')[0]
}

const GOVERNORATES = [
  { value: 'capital', label: 'Capital (Asimah)' },
  { value: 'hawalli', label: 'Hawalli' },
  { value: 'farwaniyah', label: 'Farwaniyah' },
  { value: 'ahmadi', label: 'Ahmadi' },
  { value: 'jahra', label: 'Jahra' },
  { value: 'mubarak_al_kabeer', label: 'Mubarak Al-Kabeer' },
]

// Fields validated before each step may advance.
const STEP_FIELDS: Record<number, FieldPath<PublicInquiryInput>[]> = {
  1: ['customer_name', 'customer_phone'],
  2: ['cake_size', 'flavor', 'occasion', 'cake_type', 'theme', 'message_on_cake', 'special_requirements', 'allergen_other'],
  3: ['event_date', 'pickup_time', 'delivery_type', 'address_governorate', 'address_area', 'address_block', 'address_street', 'address_house_no', 'address_extra_notes'],
}

export default function OrderForm({ flavors, sizes, occasions, blackouts, minLeadDays }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  // 1 = forward, -1 = back; drives the slide direction of step transitions.
  const [direction, setDirection] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

  const stepVariants = {
    enter: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * 16 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * -16 }),
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<PublicInquiryInput, unknown, PublicInquiryData>({
    resolver: zodResolver(publicInquirySchema),
    mode: 'onTouched',
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      cake_size: '',
      flavor: '',
      occasion: '',
      cake_type: 'normal',
      theme: '',
      message_on_cake: '',
      special_requirements: '',
      allergen_nut_free: false,
      allergen_dairy_free: false,
      allergen_egg_free: false,
      allergen_raw_sugar: false,
      allergen_other: '',
      event_date: '',
      pickup_time: '',
      delivery_type: 'pickup',
      source: 'public_form',
      address_governorate: 'capital',
      address_area: '',
      address_block: '',
      address_street: '',
      address_house_no: '',
      address_extra_notes: '',
    },
  })

  const form = watch()
  const cakeType = form.cake_type
  const deliveryType = form.delivery_type
  const dateBlackedOut = isDateBlackedOut(form.event_date ?? '', blackouts)

  const onValid = async (data: PublicInquiryData) => {
    setServerError(null)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.fieldErrors) {
          Object.entries(json.fieldErrors).forEach(([field, msgs]) => {
            setError(field as FieldPath<PublicInquiryInput>, { message: (msgs as string[])[0] })
          })
        }
        setServerError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/order/success')
    } catch {
      setServerError('Network error. Please try again.')
    }
  }

  const advanceStep = async () => {
    setServerError(null)
    const valid = await trigger(STEP_FIELDS[step])
    if (!valid) return
    if (step === 3 && dateBlackedOut) {
      setError('event_date', { type: 'manual', message: 'This date is not available. Please choose another date.' })
      return
    }
    setDirection(1)
    setStep(s => s + 1)
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                style={{
                  backgroundColor: s <= step ? 'var(--color-teal)' : 'var(--color-border)',
                  color: s <= step ? 'var(--color-cream)' : 'var(--color-ink-muted)',
                }}
              >
                {s}
              </div>
              {i < 3 && (
                <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: s < step ? 'var(--color-teal)' : 'var(--color-border)' }} />
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          Step {step} of 4 — {['Who are you?', 'Your Cake', 'When & How?', 'Review'][step - 1]}
        </p>
      </div>

      {/* Step content — animated forward/back, matching the Modal's motion system */}
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
        >
      {/* Step 1 — Who are you? */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Let&apos;s start with you</h2>
          <Field label="Your Name" error={errors.customer_name?.message} required>
            <Input
              {...register('customer_name')}
              placeholder="e.g. Sara Al-Qatami"
              autoComplete="name"
              required
              aria-invalid={errors.customer_name ? true : undefined}
            />
          </Field>
          <Field label="Phone Number" error={errors.customer_phone?.message} required>
            <PhoneInput
              value={form.customer_phone}
              onChange={value => setValue('customer_phone', value, { shouldValidate: true })}
            />
          </Field>
        </div>
      )}

      {/* Step 2 — Your Cake */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Tell us about your cake</h2>

          <Field label="Cake Size" error={errors.cake_size?.message} required>
            <RadioGroup
              value={form.cake_size || null}
              onChange={v => setValue('cake_size', v, { shouldValidate: true })}
              options={sizes.map(s => ({ value: s.name, label: s.name }))}
              className="flex-wrap"
              aria-label="Cake size"
            />
          </Field>

          <Field label="Flavor" error={errors.flavor?.message} required>
            <Select {...register('flavor')} required aria-invalid={errors.flavor ? true : undefined}>
              <option value="">Select a flavor…</option>
              {flavors.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </Select>
          </Field>

          <Field label="Occasion" error={errors.occasion?.message}>
            <Select {...register('occasion')}>
              <option value="">Select an occasion…</option>
              {occasions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>

          <Field label="Cake Type" error={errors.cake_type?.message} required>
            <RadioGroup
              value={cakeType}
              onChange={v => {
                setValue('cake_type', v, { shouldDirty: true })
                if (v === 'normal') clearErrors('theme')
              }}
              options={[
                { value: 'normal', label: 'Normal cake', description: 'A classic ZMade design' },
                { value: 'theme', label: 'Theme cake', description: 'Designed around your idea' },
              ]}
              aria-label="Cake type"
            />
          </Field>

          {cakeType === 'theme' && (
            <Field label="Your Theme" error={errors.theme?.message} required>
              <Input
                {...register('theme')}
                placeholder="e.g. Butterfly garden, football, unicorn…"
                required
                aria-invalid={errors.theme ? true : undefined}
              />
            </Field>
          )}

          <Field label="Message on Cake" error={errors.message_on_cake?.message}>
            <Input {...register('message_on_cake')} placeholder="e.g. Happy Birthday Sara!" />
          </Field>

          <Field
            label="Cake Details"
            error={errors.special_requirements?.message}
            hint="Colours, tiers, decoration ideas — anything that helps us picture it."
          >
            <Textarea {...register('special_requirements')} rows={3} placeholder="e.g. Two tiers, pastel pink, fresh flowers on top…" />
          </Field>

          <div>
            <p className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Dietary Requirements</p>
            <div className="grid grid-cols-2 gap-2">
              <Checkbox {...register('allergen_nut_free')} label="Nut-free" />
              <Checkbox {...register('allergen_dairy_free')} label="Dairy-free" />
              <Checkbox {...register('allergen_egg_free')} label="Egg-free" />
              <Checkbox {...register('allergen_raw_sugar')} label="Raw sugar" />
            </div>
            <div className="mt-2">
              <Input {...register('allergen_other')} placeholder="Other dietary notes…" aria-label="Other dietary notes" />
              {errors.allergen_other && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.allergen_other.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — When & How? */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>When do you need it?</h2>

          <Field label="Event Date" error={errors.event_date?.message} required>
            <Input
              {...register('event_date', {
                onChange: () => clearErrors('event_date'),
              })}
              type="date"
              min={getMinDate(minLeadDays)}
              required
              aria-invalid={errors.event_date || dateBlackedOut ? true : undefined}
            />
            {!errors.event_date && form.event_date && dateBlackedOut && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                This date is not available. Please choose another date.
              </p>
            )}
          </Field>

          <Field label="Preferred Pickup / Delivery Time" error={errors.pickup_time?.message}>
            <Input {...register('pickup_time')} type="time" />
          </Field>

          <Field label="Collection Method" error={errors.delivery_type?.message} required>
            <RadioGroup
              value={deliveryType}
              onChange={v => setValue('delivery_type', v, { shouldDirty: true })}
              options={[
                { value: 'pickup', label: 'Pickup', description: 'Collect from the studio' },
                { value: 'delivery', label: 'Delivery', description: 'We bring it to you' },
              ]}
              aria-label="Collection method"
            />
          </Field>

          {deliveryType === 'delivery' && (
            <div className="flex flex-col gap-4 pt-1">
              <Field label="Governorate" error={errors.address_governorate?.message}>
                <Select {...register('address_governorate')}>
                  {GOVERNORATES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Area" error={errors.address_area?.message} required>
                  <Input {...register('address_area')} placeholder="Area" required aria-invalid={errors.address_area ? true : undefined} />
                </Field>
                <Field label="Block" error={errors.address_block?.message} required>
                  <Input {...register('address_block')} placeholder="Block" required aria-invalid={errors.address_block ? true : undefined} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Street" error={errors.address_street?.message} required>
                  <Input {...register('address_street')} placeholder="Street" required aria-invalid={errors.address_street ? true : undefined} />
                </Field>
                <Field label="House / Apartment No." error={errors.address_house_no?.message} required>
                  <Input {...register('address_house_no')} placeholder="No." required aria-invalid={errors.address_house_no ? true : undefined} />
                </Field>
              </div>
              <Field label="Extra Notes" error={errors.address_extra_notes?.message}>
                <Input {...register('address_extra_notes')} placeholder="Floor, apartment name, landmark…" />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Review & Submit */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Review your order</h2>

          {/* Customer summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-muted)' }}>Customer</p>
            <SummaryRow label="Name" value={form.customer_name ?? ''} />
            <SummaryRow label="Phone" value={form.customer_phone ?? ''} />
          </section>

          {/* Cake summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-muted)' }}>Cake</p>
            <SummaryRow label="Size" value={form.cake_size ?? ''} />
            <SummaryRow label="Flavor" value={form.flavor ?? ''} />
            {form.occasion && <SummaryRow label="Occasion" value={form.occasion} />}
            <SummaryRow label="Type" value={cakeType === 'theme' ? `Theme cake — ${form.theme || ''}` : 'Normal cake'} />
            {form.message_on_cake && <SummaryRow label="Message" value={form.message_on_cake} />}
            {form.special_requirements && <SummaryRow label="Details" value={form.special_requirements} />}
            {(form.allergen_nut_free || form.allergen_dairy_free || form.allergen_egg_free || form.allergen_raw_sugar || form.allergen_other) && (
              <SummaryRow
                label="Dietary"
                value={[
                  form.allergen_nut_free && 'Nut-free',
                  form.allergen_dairy_free && 'Dairy-free',
                  form.allergen_egg_free && 'Egg-free',
                  form.allergen_raw_sugar && 'Raw sugar',
                  form.allergen_other || '',
                ].filter(Boolean).join(', ')}
              />
            )}
          </section>

          {/* Delivery summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-muted)' }}>Delivery</p>
            <SummaryRow label="Event Date" value={form.event_date ?? ''} />
            {form.pickup_time && <SummaryRow label="Time" value={form.pickup_time} />}
            <SummaryRow label="Method" value={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} />
            {deliveryType === 'delivery' && (
              <>
                {form.address_governorate && <SummaryRow label="Governorate" value={GOVERNORATES.find(g => g.value === form.address_governorate)?.label ?? form.address_governorate} />}
                {form.address_area && <SummaryRow label="Area" value={form.address_area} />}
                {form.address_block && <SummaryRow label="Block" value={form.address_block} />}
                {form.address_street && <SummaryRow label="Street" value={form.address_street} />}
                {form.address_house_no && <SummaryRow label="House No." value={form.address_house_no} />}
                {form.address_extra_notes && <SummaryRow label="Notes" value={form.address_extra_notes} />}
              </>
            )}
          </section>

          {serverError && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              {serverError}
            </p>
          )}
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Error display (steps 1-3) */}
      {serverError && step < 4 && (
        <p className="mt-4 text-sm rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
          {serverError}
        </p>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1 rounded-xl"
            onClick={() => { setServerError(null); setDirection(-1); setStep(s => s - 1) }}
          >
            Back
          </Button>
        )}
        {step < 4 ? (
          <Button type="button" size="lg" className="flex-1 rounded-xl" onClick={advanceStep}>
            Next
          </Button>
        ) : (
          <Button type="submit" size="lg" className="flex-1 rounded-xl" loading={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send My Order'}
          </Button>
        )}
      </div>
    </form>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs pt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span className="text-sm text-right" style={{ color: 'var(--color-ink-secondary)' }}>{value}</span>
    </div>
  )
}
