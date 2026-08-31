'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, type FieldErrors, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART, holdMinimumVisible } from '@/lib/motion'
import { formatDate } from '@/lib/format'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import PhoneInput from '@/components/PhoneInput'
import ReferencePhotoUpload, { type ReferenceImage } from '@/components/ReferencePhotoUpload'
import {
  publicInquirySchema,
  minPublicEventDate,
  type PublicInquiryInput,
  type PublicInquiryData,
} from '@/lib/validations/publicInquiry'
import { Button, CakeLoader, Checkbox, DetailRow, Field, Input, RadioGroup, Select, Textarea } from '@/components/ui'
import { Check, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react'

interface Option { id: string; name: string }
interface FlavorOption extends Option {
  theme_available: boolean
  prices: { size_id: string }[]
}
interface Blackout { id: string; date_from: string; date_to: string; reason: string }
interface Props {
  flavors: FlavorOption[]
  sizes: Option[]
  occasions: Option[]
  blackouts: Blackout[]
  minLeadDays: number
  /** Pre-selected from a flavor card's "Order this cake" / "Customize" link on the landing page. */
  initialFlavor?: string
  initialCakeType?: 'theme'
}

function isDateBlackedOut(date: string, blackouts: Blackout[]): boolean {
  if (!date) return false
  const d = new Date(date)
  return blackouts.some(b => new Date(b.date_from) <= d && d <= new Date(b.date_to))
}

function getMinDate(minLeadDays: number): string {
  const d = minPublicEventDate(minLeadDays)
  // Build the date string from local parts — toISOString() converts to UTC, which
  // shifts the date backward by a day for local times between 00:00 and 03:00 Kuwait
  // time (UTC+3).
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const GOVERNORATES = [
  { value: 'capital', label: 'Capital (Asimah)' },
  { value: 'hawalli', label: 'Hawalli' },
  { value: 'farwaniyah', label: 'Farwaniyah' },
  { value: 'ahmadi', label: 'Ahmadi' },
  { value: 'jahra', label: 'Jahra' },
  { value: 'mubarak_al_kabeer', label: 'Mubarak Al-Kabeer' },
]

const DRAFT_STORAGE_KEY = 'zmade-order-draft-v1'

interface OrderDraft {
  step: number
  values: Partial<PublicInquiryInput>
  referenceImages: ReferenceImage[]
}

// Step labels/field-groups for the pickup branch (5 steps — no dedicated address step).
const STEP_LABELS_PICKUP = ['About You', 'Cake Basics', 'Details', 'When & How', 'Review']
// Step labels for the delivery branch (6 steps — address gets its own step between
// "When & How" and Review).
const STEP_LABELS_DELIVERY = ['About You', 'Cake Basics', 'Details', 'When & How', 'Delivery Address', 'Review']

// The delivery-address step is always step 5 when it exists (it only exists in the
// delivery branch, immediately after "When & How").
const ADDRESS_STEP = 5

// Fields validated before each step may advance. Steps 1, 3, 4 are static (order-level
// fields only); step 2 (Cake Basics) is computed per-render from the live item count —
// see `step2Fields` in the component body — since its fields are `items.${i}.*` for
// every item, not a fixed set. Step 5 differs by branch (address fields for delivery,
// unused for pickup since step 4 skips straight to Review).
const STEP_1_FIELDS: FieldPath<PublicInquiryInput>[] = ['customer_name', 'customer_phone']
// Message on Cake / Cake Details moved into the per-item block (Cake Basics, step 2)
// since a message/special-requirement belongs to one specific cake now — Details (step 3)
// keeps only order-level fields. Reference Photos has no registered field (plain React
// state, not RHF-validated), so it never appears here.
const STEP_3_FIELDS: FieldPath<PublicInquiryInput>[] = ['allergen_other']
const STEP_4_FIELDS: FieldPath<PublicInquiryInput>[] = ['event_date', 'pickup_time', 'delivery_type']
const ADDRESS_STEP_FIELDS: FieldPath<PublicInquiryInput>[] = [
  'address_governorate', 'address_area', 'address_block', 'address_street', 'address_house_no', 'address_extra_notes',
]
// Per-item field keys validated for every item in Cake Basics — expanded to
// `items.${i}.${key}` for each item present when the step advances.
const ITEM_FIELD_KEYS = ['cake_size', 'flavor', 'occasion', 'cake_type', 'theme', 'message_on_cake', 'special_requirements'] as const

// Blank item used both as the form's initial single item and as the template appended
// by "Add another cake". A fresh shallow copy is spread at each use site so array
// entries never accidentally share the same object reference.
const defaultItem: PublicInquiryInput['items'][number] = {
  cake_size: '',
  flavor: '',
  occasion: '',
  cake_type: 'normal',
  theme: '',
  message_on_cake: '',
  special_requirements: '',
}

export default function OrderForm({
  flavors,
  sizes,
  occasions,
  blackouts,
  minLeadDays,
  initialFlavor,
  initialCakeType,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  // 1 = forward, -1 = back; drives the slide direction of step transitions.
  const [direction, setDirection] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [draftRestored, setDraftRestored] = useState(false)
  const reduceMotion = useReducedMotion()
  const isFirstStepRender = useRef(true)

  const stepVariants = {
    enter: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * 16 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * -16 }),
  }

  const defaultValues: PublicInquiryInput = {
    customer_name: '',
    customer_phone: '',
    items: [{
      ...defaultItem,
      ...(initialFlavor ? { flavor: initialFlavor } : {}),
      ...(initialCakeType ? { cake_type: initialCakeType } : {}),
    }],
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
    address_location_link: '',
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    reset,
    control,
    formState: { errors },
  } = useForm<PublicInquiryInput, unknown, PublicInquiryData>({
    resolver: zodResolver(publicInquirySchema),
    mode: 'onTouched',
    defaultValues,
  })

  // Cake Basics (step 2) is the repeatable unit — one field-array entry per distinct
  // cake in the order. The rest of the wizard's steps stay flat/order-level.
  const { fields, append, remove, insert } = useFieldArray({ control, name: 'items' })

  const form = watch()
  const deliveryType = form.delivery_type
  const dateBlackedOut = isDateBlackedOut(form.event_date ?? '', blackouts)

  // Total step count is conditional: delivery adds a dedicated address step (6),
  // pickup skips straight from "When & How" to Review (5).
  const totalSteps = deliveryType === 'delivery' ? 6 : 5
  const reviewStep = totalSteps
  const STEP_LABELS = deliveryType === 'delivery' ? STEP_LABELS_DELIVERY : STEP_LABELS_PICKUP

  // Recomputed each render from the live item count, so `trigger(STEP_FIELDS[2])` on
  // "Next" validates every item's fields, not just a fixed set.
  const step2Fields: FieldPath<PublicInquiryInput>[] = fields.flatMap((_, i) =>
    ITEM_FIELD_KEYS.map(key => `items.${i}.${key}` as FieldPath<PublicInquiryInput>)
  )
  const STEP_FIELDS_BASE: Record<number, FieldPath<PublicInquiryInput>[]> = {
    1: STEP_1_FIELDS,
    2: step2Fields,
    3: STEP_3_FIELDS,
    4: STEP_4_FIELDS,
  }
  const STEP_FIELDS: Record<number, FieldPath<PublicInquiryInput>[]> = deliveryType === 'delivery'
    ? { ...STEP_FIELDS_BASE, [ADDRESS_STEP]: ADDRESS_STEP_FIELDS }
    : STEP_FIELDS_BASE

  // Per-item derived flavor/size data — was a single flat computation when there was
  // one cake; now one lookup per item, called from within the Cake Basics render loop.
  function flavorMetaFor(flavorName: string) {
    const selectedFlavor = flavors.find(f => f.name === flavorName) ?? null
    // A flavor with no priced sizes hasn't been restricted yet — offer every size.
    const availableSizes = selectedFlavor && selectedFlavor.prices.length > 0
      ? sizes.filter(s => selectedFlavor.prices.some(p => p.size_id === s.id))
      : sizes
    const themeDisabled = selectedFlavor !== null && !selectedFlavor.theme_available
    return { selectedFlavor, availableSizes, themeDisabled }
  }

  const draftSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirrors `step` for the popstate handler below, which needs the step we're
  // navigating *from* to compute slide direction, without re-subscribing on
  // every step change.
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  }, [step])

  // Restore an in-progress draft (e.g. after WhatsApp's in-app browser evicts the tab),
  // then establish the browser-history entry matching wherever the wizard starts
  // (step 1, or a restored mid-wizard step). We use `replaceState`, not `pushState`,
  // because this is annotating the history entry that already exists for the initial
  // page load with step info — not adding a new entry (which would give an extra,
  // no-op Back press). Note this only tags the *current* entry; it doesn't
  // synthesize a full stack of entries for steps below a restored one, so Back
  // from a restored mid-wizard position leaves /inquire rather than stepping down
  // through the wizard — an accepted gap since sessionStorage restore-on-refresh
  // is a separate, already-solved concern from history navigation.
  useEffect(() => {
    let initialStep = 1
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const draft: OrderDraft = JSON.parse(raw)
        reset({ ...defaultValues, ...draft.values })
        initialStep = draft.step
        setStep(draft.step)
        setReferenceImages(draft.referenceImages ?? [])
        setDraftRestored(true)
      }
    } catch {
      // Corrupt or stale draft — ignore and start fresh.
    }
    window.history.replaceState({ step: initialStep }, '', `${window.location.pathname}?step=${initialStep}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for the browser/OS Back (and Forward) button so it steps the wizard
  // instead of leaving /inquire. This uses the native History API directly rather
  // than next/navigation's router: per the Next.js docs (see
  // node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md,
  // "Native History API" section), `window.history.pushState`/`replaceState` are
  // the documented way to sync browser history with pure client-side state
  // changes on the current route, without going through the App Router (which
  // would treat a `router.push`/`replace` as a navigation and risk an RSC
  // round-trip for a change that's purely internal to this client component).
  // We only ever *read* history.state here, never push — every popstate already
  // consumed exactly one entry, so pushing again would break the Back button.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const target = (event.state as { step?: number } | null)?.step
      if (typeof target === 'number' && target >= 1) {
        setDirection(target < stepRef.current ? -1 : 1)
        setStep(target)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Navigate to a step, both updating local state and pushing a matching
  // history entry so the browser Back button can step back out of it later.
  const goToStep = useCallback((target: number, dir: number) => {
    setDirection(dir)
    setStep(target)
    window.history.pushState({ step: target }, '', `${window.location.pathname}?step=${target}`)
  }, [])

  // Focus the new step's heading as soon as it mounts, so screen-reader users get
  // an announcement and low-vision users get the new step scrolled into view.
  // A ref *callback* (not a useEffect keyed on `step`) is required here: with
  // AnimatePresence's mode="wait", the incoming step's heading doesn't mount
  // until the outgoing one finishes its ~160ms exit animation, so a
  // requestAnimationFrame-timed focus() call would land on the stale, exiting
  // node instead. The callback must also be memoized — an inline arrow function
  // gets a new identity on every render (including every keystroke, since
  // `watch()` re-renders the form), which would re-fire on each render and
  // steal focus out of whatever field the user is typing in.
  const focusStepHeading = useCallback((node: HTMLHeadingElement | null) => {
    if (!node) return
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false
      return
    }
    node.focus()
  }, [])

  useEffect(() => {
    if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    draftSaveTimeout.current = setTimeout(() => {
      const draft: OrderDraft = { step, values: form, referenceImages }
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    }, 400)
    return () => {
      if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    }
  }, [form, step, referenceImages])

  const handleFlavorChange = (index: number, flavorName: string) => {
    const nextFlavor = flavors.find(f => f.name === flavorName) ?? null
    const item = form.items?.[index]

    if (nextFlavor && !nextFlavor.theme_available && item?.cake_type === 'theme') {
      setValue(`items.${index}.cake_type`, 'normal', { shouldDirty: true })
      setValue(`items.${index}.theme`, '')
      clearErrors(`items.${index}.theme`)
    }

    const nextSizes = nextFlavor && nextFlavor.prices.length > 0
      ? sizes.filter(s => nextFlavor.prices.some(p => p.size_id === s.id))
      : sizes
    if (item?.cake_size && !nextSizes.some(s => s.name === item.cake_size)) {
      setValue(`items.${index}.cake_size`, '', { shouldValidate: true })
    }
  }

  // Keeps the <CakeLoader> up through the redirect: `onSuccess` runs *after*
  // `submitting` clears, so without this the review screen would flash for a
  // frame between the loader vanishing and /inquire/success mounting.
  const [navigating, setNavigating] = useState(false)

  const scrollToFirstInvalid = () => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  // Earliest wizard step holding an errored field. Both the server-error path and
  // the RHF onInvalid path key their errors by *top-level* field name (zod's
  // `flatten()` server-side; RHF's errors object client-side) — an error on
  // `items.0.cake_size` shows up as a bare `"items"` — so match by prefix as well
  // so it still routes to step 2 (Cake Basics).
  const earliestErroredStep = (erroredFields: string[]) => {
    const dataSteps = Array.from({ length: reviewStep - 1 }, (_, i) => i + 1)
    return dataSteps.find(s =>
      (STEP_FIELDS[s] ?? []).some(field => erroredFields.some(ef => field === ef || field.startsWith(`${ef}.`)))
    )
  }

  const { run: submitInquiry, pending: submitting } = useAsyncAction(
    async (data: PublicInquiryData) => {
      const startedAt = Date.now()
      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, reference_images: referenceImages }),
        })
        const json = await res.json()
        if (!res.ok) {
          // Errors surface immediately — never held back to let the loader finish.
          if (json.fieldErrors) {
            const erroredFields = Object.keys(json.fieldErrors)
            erroredFields.forEach(field => {
              setError(field as FieldPath<PublicInquiryInput>, { message: (json.fieldErrors[field] as string[])[0] })
            })
            const earliestStep = earliestErroredStep(erroredFields)
            if (earliestStep && earliestStep !== step) {
              goToStep(earliestStep, earliestStep < step ? -1 : 1)
              setTimeout(scrollToFirstInvalid, 200)
            }
          }
          setServerError(json.error ?? 'Something went wrong. Please try again.')
          return false
        }
        sessionStorage.removeItem(DRAFT_STORAGE_KEY)
        await holdMinimumVisible(startedAt, 1400)
        setNavigating(true)
      } catch {
        setServerError('Network error. Please try again.')
        return false
      }
    },
    {
      successToast: 'Inquiry sent',
      onSuccess: () => router.push('/inquire/success'),
    }
  )

  const onValid = (data: PublicInquiryData) => {
    setServerError(null)
    submitInquiry(data)
  }

  // §2.5 — on an invalid submit, jump to the step holding the first errored field
  // BEFORE the toast + scroll (otherwise that field isn't mounted yet), then
  // surface the toast and scroll it into view.
  const onInvalid = (formErrors: FieldErrors<PublicInquiryInput>) => {
    setServerError(null)
    const earliestStep = earliestErroredStep(Object.keys(formErrors))
    const jumped = !!earliestStep && earliestStep !== step
    if (jumped) goToStep(earliestStep!, earliestStep! < step ? -1 : 1)
    toast.error('Check the highlighted fields')
    setTimeout(scrollToFirstInvalid, jumped ? 200 : 0)
  }

  const advanceStep = async () => {
    setServerError(null)
    const valid = await trigger(STEP_FIELDS[step])
    if (!valid) return
    if (step === 4 && dateBlackedOut) {
      setError('event_date', { type: 'manual', message: 'This date is not available. Please choose another date.' })
      return
    }
    // Always the next step number, not a hardcoded target: step 5 naturally
    // renders as the delivery-address step when `deliveryType === 'delivery'`
    // and as Review when 'pickup' (see the step-5/reviewStep render branches
    // below), so incrementing by one lands correctly for either branch.
    goToStep(step + 1, 1)
  }

  // Jump directly to a step from the review screen's edit affordances.
  const jumpToStep = (target: number) => {
    goToStep(target, -1)
  }

  if (submitting || navigating) {
    return (
      <div
        className="rounded-2xl border flex flex-col items-center justify-center gap-2 text-center"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          minHeight: 320,
        }}
        aria-live="polite"
        aria-busy="true"
      >
        <CakeLoader size={110} label="Sending your inquiry…" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
      {/* Page heading — the customer's first brand moment, in the /confirm hero's voice */}
      <div className="mb-7">
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          Tell us what you&apos;re celebrating
        </h1>
        <p className="text-lg font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-secondary)' }}>
          we&apos;ll bring the cake to match.
        </p>
        <p className="text-sm mt-3" style={{ color: 'var(--color-ink-muted)' }}>
          A few quick steps, then we&apos;ll confirm every detail with you before anything is final.
        </p>
      </div>

      {/* Draft-restored acknowledgment — dismissed only by deliberate user action, no auto-hide */}
      {draftRestored && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
        >
          <p className="text-sm">Draft restored. Pick up where you left off.</p>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Dismiss"
            className="inline-flex items-center justify-center shrink-0 min-h-11 min-w-11 -my-2 -mr-2"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* Progress bar — only the current step reads as teal; done steps are a quiet ink/wash signal */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => {
            const isDone = s < step
            const isCurrent = s === step
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                  style={
                    isCurrent
                      ? {
                          backgroundColor: 'var(--color-cream)',
                          color: 'var(--color-teal)',
                          border: '2px solid var(--color-teal)',
                        }
                      : isDone
                      ? { backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }
                      : { backgroundColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }
                  }
                >
                  {isDone ? <Check size={14} weight="bold" /> : s}
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1"
                    style={{ backgroundColor: s < step ? 'var(--color-border-strong)' : 'var(--color-border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2.5 text-xs" style={{ color: 'var(--color-ink-muted)' }} aria-live="polite">
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)', fontWeight: 600 }}>
            Step {step}
          </span>{' '}
          of {totalSteps} · {STEP_LABELS[step - 1]}
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
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>Let&apos;s start with you</h2>
          <Field label="Full Name" htmlFor="order-customer-name" error={errors.customer_name?.message} required>
            <Input
              id="order-customer-name"
              {...register('customer_name')}
              autoComplete="name"
              required
              aria-invalid={errors.customer_name ? true : undefined}
              size="base"
            />
          </Field>
          <Field label="Phone Number" htmlFor="order-customer-phone" error={errors.customer_phone?.message} required>
            <PhoneInput
              id="order-customer-phone"
              value={form.customer_phone}
              onChange={value => setValue('customer_phone', value, { shouldValidate: true })}
              size="base"
            />
          </Field>
        </div>
      )}

      {/* Step 2 — Cake Basics. The repeatable unit: one card per cake in the order. */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>
            Tell us about your cake{fields.length > 1 ? 's' : ''}
          </h2>

          <div className="flex flex-col gap-4">
            {/* mode="popLayout" is required alongside `layout` here — without it, an
                exiting card stays in normal document flow for the duration of its exit
                animation, so the cards below it can't slide up into place until it
                finally unmounts. That produces the double-jump/race the wizard shipped
                with: nothing moves, then everything snaps at once. popLayout pulls the
                exiting card out of flow (position: absolute) the instant it starts
                exiting, so the remaining cards reflow smoothly right away while it
                animates out independently. See framer-motion's AnimatePresence + layout
                docs, and app/admin/orders/_components/AnimatedCardList.tsx, which
                already solved this same problem the same way for the orders board. */}
            <AnimatePresence initial={false} mode="popLayout">
              {fields.map((itemField, index) => {
                const item = form.items?.[index]
                const itemErrors = errors.items?.[index]
                const { selectedFlavor, availableSizes, themeDisabled } = flavorMetaFor(item?.flavor ?? '')
                const itemCakeType = item?.cake_type

                return (
                  <motion.div
                    key={itemField.id}
                    layout={reduceMotion ? false : 'position'}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE_OUT_QUART }}
                    className="rounded-xl border p-4 sm:p-5 flex flex-col gap-5"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        {fields.length > 1 ? `Cake ${index + 1}` : 'Your Cake'}
                      </p>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const removedItem = form.items?.[index]
                            const removedIndex = index
                            remove(index)
                            // Fixed id: a second remove before the first Undo is clicked
                            // replaces this toast rather than stacking another one, so
                            // there's never more than one stale removedIndex in flight.
                            toast('Cake removed', {
                              id: 'remove-cake-undo',
                              action: {
                                label: 'Undo',
                                onClick: () => {
                                  if (removedItem) insert(Math.min(removedIndex, form.items?.length ?? 0), removedItem)
                                },
                              },
                            })
                          }}
                          aria-label={`Remove Cake ${index + 1}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0 min-h-11 px-2 -my-2"
                          style={{ color: 'var(--color-ink-muted)' }}
                        >
                          <Trash size={14} weight="bold" />
                          Remove
                        </button>
                      )}
                    </div>

                    <Field label="Flavor" htmlFor={`order-flavor-${index}`} error={itemErrors?.flavor?.message} required>
                      <Select
                        id={`order-flavor-${index}`}
                        {...register(`items.${index}.flavor`, { onChange: e => handleFlavorChange(index, e.target.value) })}
                        required
                        aria-invalid={itemErrors?.flavor ? true : undefined}
                        size="base"
                      >
                        <option value="">Select a flavor…</option>
                        {flavors.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                      </Select>
                    </Field>

                    <Field
                      label="Cake Size"
                      error={itemErrors?.cake_size?.message}
                      required
                      hint={selectedFlavor && availableSizes.length < sizes.length ? 'Available sizes for this flavor' : undefined}
                    >
                      <RadioGroup
                        value={item?.cake_size || null}
                        onChange={v => setValue(`items.${index}.cake_size`, v, { shouldValidate: true })}
                        options={availableSizes.map(s => ({ value: s.name, label: s.name }))}
                        className="flex-wrap"
                        aria-label={`Cake ${index + 1} size`}
                      />
                    </Field>

                    <Field label="Occasion" htmlFor={`order-occasion-${index}`} error={itemErrors?.occasion?.message}>
                      <Select id={`order-occasion-${index}`} {...register(`items.${index}.occasion`)} size="base">
                        <option value="">Select an occasion…</option>
                        {occasions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                      </Select>
                    </Field>

                    <Field
                      label="Cake Type"
                      error={itemErrors?.cake_type?.message}
                      required
                      hint={themeDisabled ? 'Theme cakes aren’t available for this flavor' : undefined}
                    >
                      <RadioGroup
                        value={itemCakeType}
                        onChange={v => {
                          setValue(`items.${index}.cake_type`, v, { shouldDirty: true })
                          if (v === 'normal') clearErrors(`items.${index}.theme`)
                        }}
                        options={[
                          { value: 'normal', label: 'Normal cake', description: 'A classic ZMade Cakes design' },
                          { value: 'theme', label: 'Theme cake', description: 'Designed around your idea', disabled: themeDisabled },
                        ]}
                        aria-label={`Cake ${index + 1} type`}
                      />
                    </Field>

                    {itemCakeType === 'theme' && (
                      <Field label="Your Theme" htmlFor={`order-theme-${index}`} error={itemErrors?.theme?.message} required>
                        <Input
                          id={`order-theme-${index}`}
                          {...register(`items.${index}.theme`)}
                          dir="auto"
                          required
                          aria-invalid={itemErrors?.theme ? true : undefined}
                          size="base"
                        />
                      </Field>
                    )}

                    <Field label="Message on Cake" htmlFor={`order-message-on-cake-${index}`} error={itemErrors?.message_on_cake?.message}>
                      <Input id={`order-message-on-cake-${index}`} {...register(`items.${index}.message_on_cake`)} dir="auto" size="base" />
                    </Field>

                    <Field
                      label="Cake Details"
                      htmlFor={`order-special-requirements-${index}`}
                      error={itemErrors?.special_requirements?.message}
                      hint="Colours, tiers, decoration ideas — anything that helps us picture it."
                    >
                      <Textarea id={`order-special-requirements-${index}`} {...register(`items.${index}.special_requirements`)} rows={3} dir="auto" size="base" />
                    </Field>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => append({ ...defaultItem })}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold min-h-11 transition-colors hover:bg-[var(--color-surface-raised)]"
            style={{ border: '1px dashed var(--color-border-strong)', color: 'var(--color-teal)' }}
          >
            <Plus size={16} weight="bold" />
            Add another cake
          </button>
        </div>
      )}

      {/* Step 3 — Details. Message on Cake / Cake Details moved into each item's own card
          in Cake Basics (step 2) — this step now covers only order-level extras. */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>A few more details</h2>

          <div>
            <p className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
              Reference Photos <span style={{ fontWeight: 400 }}>(optional)</span>
            </p>
            <ReferencePhotoUpload images={referenceImages} onChange={setReferenceImages} />
          </div>

          <div>
            <p className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>Dietary Requirements</p>
            <div className="grid grid-cols-2 gap-2">
              <Checkbox {...register('allergen_nut_free')} label="Nut-free" />
              <Checkbox {...register('allergen_dairy_free')} label="Dairy-free" />
              <Checkbox {...register('allergen_egg_free')} label="Egg-free" />
              <Checkbox {...register('allergen_raw_sugar')} label="Raw sugar (no refined sugar)" />
            </div>
            <div className="mt-2">
              <Input {...register('allergen_other')} placeholder="Other dietary notes…" aria-label="Other dietary notes" size="base" />
              {errors.allergen_other && (
                <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.allergen_other.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — When & How? */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>When do you need it?</h2>

          <Field label="Event Date" htmlFor="order-event-date" error={errors.event_date?.message} required>
            <Input
              id="order-event-date"
              {...register('event_date', {
                onChange: () => clearErrors('event_date'),
              })}
              type="date"
              min={getMinDate(minLeadDays)}
              required
              aria-invalid={errors.event_date || dateBlackedOut ? true : undefined}
              size="base"
            />
            {!errors.event_date && form.event_date && dateBlackedOut && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                This date is not available. Please choose another date.
              </p>
            )}
          </Field>

          <Field label="Preferred Pickup / Delivery Time" htmlFor="order-pickup-time" error={errors.pickup_time?.message}>
            <Input id="order-pickup-time" {...register('pickup_time')} type="time" size="base" />
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
        </div>
      )}

      {/* Step 5 — Delivery Address (only inserted into the sequence when delivery_type === 'delivery') */}
      {step === ADDRESS_STEP && deliveryType === 'delivery' && (
        <div className="flex flex-col gap-5">
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>Where should we deliver it?</h2>

          <Field label="Governorate" htmlFor="order-address-governorate" error={errors.address_governorate?.message}>
            <Select id="order-address-governorate" {...register('address_governorate')} size="base">
              {GOVERNORATES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area" htmlFor="order-address-area" error={errors.address_area?.message} required>
              <Input id="order-address-area" {...register('address_area')} required aria-invalid={errors.address_area ? true : undefined} size="base" />
            </Field>
            <Field label="Block" htmlFor="order-address-block" error={errors.address_block?.message} required>
              <Input id="order-address-block" {...register('address_block')} required aria-invalid={errors.address_block ? true : undefined} size="base" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Street" htmlFor="order-address-street" error={errors.address_street?.message} required>
              <Input id="order-address-street" {...register('address_street')} required aria-invalid={errors.address_street ? true : undefined} size="base" />
            </Field>
            <Field label="House / Apartment No." htmlFor="order-address-house-no" error={errors.address_house_no?.message} required>
              <Input id="order-address-house-no" {...register('address_house_no')} required aria-invalid={errors.address_house_no ? true : undefined} size="base" />
            </Field>
          </div>
          <Field label="Extra Notes" htmlFor="order-address-extra-notes" error={errors.address_extra_notes?.message}>
            <Input id="order-address-extra-notes" {...register('address_extra_notes')} placeholder="Floor, apartment name, landmark…" dir="auto" size="base" />
          </Field>
          <Field
            label="Google Maps Pin"
            htmlFor="order-address-location-link"
            error={errors.address_location_link?.message}
            hint="Open Google Maps, drop a pin on your location, tap Share, and paste the link here."
          >
            <Input id="order-address-location-link" {...register('address_location_link')} placeholder="https://maps.app.goo.gl/…" size="base" />
          </Field>
        </div>
      )}

      {/* Review & Submit — the wizard's final step, whichever step number that is for the current branch */}
      {step === reviewStep && (
        <div className="flex flex-col gap-5">
          <h2 ref={focusStepHeading} tabIndex={-1} className="text-lg font-semibold mb-4 outline-none" style={{ color: 'var(--color-ink)' }}>Review your inquiry</h2>

          {/* Customer summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <SummaryHeader label="Customer" onEdit={() => jumpToStep(1)} />
            <DetailRow label="Name" value={form.customer_name ?? ''} />
            <DetailRow label="Phone" value={form.customer_phone ?? ''} mono />
          </section>

          {/* Cake Basics summary — one block per item. Message/Cake Details render inside
              each item's own block now, since they're per-item, not order-level. */}
          {(form.items ?? []).map((item, index) => (
            <section
              key={index}
              className="rounded-xl border p-4 flex flex-col gap-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <SummaryHeader
                label={(form.items?.length ?? 1) > 1 ? `Cake ${index + 1}` : 'Cake Basics'}
                onEdit={() => jumpToStep(2)}
              />
              <DetailRow label="Size" value={item.cake_size ?? ''} />
              <DetailRow label="Flavor" value={item.flavor ?? ''} />
              {item.occasion && <DetailRow label="Occasion" value={item.occasion} />}
              <DetailRow
                label="Type"
                value={item.cake_type === 'theme' ? `Theme cake — ${item.theme || ''}` : 'Normal cake'}
                dir="auto"
              />
              {item.message_on_cake && <DetailRow label="Message" value={item.message_on_cake} dir="auto" />}
              {item.special_requirements && <DetailRow label="Cake Details" value={item.special_requirements} dir="auto" />}
            </section>
          ))}

          {/* Details summary — order-level only (Reference Photos + Dietary) */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <SummaryHeader label="Details" onEdit={() => jumpToStep(3)} />
            {referenceImages.length > 0 && (
              <DetailRow label="Reference Photos" value={`${referenceImages.length} attached`} />
            )}
            {(form.allergen_nut_free || form.allergen_dairy_free || form.allergen_egg_free || form.allergen_raw_sugar || form.allergen_other) && (
              <DetailRow
                label="Dietary"
                value={[
                  form.allergen_nut_free && 'Nut-free',
                  form.allergen_dairy_free && 'Dairy-free',
                  form.allergen_egg_free && 'Egg-free',
                  form.allergen_raw_sugar && 'Raw sugar (no refined sugar)',
                  form.allergen_other || '',
                ].filter(Boolean).join(', ')}
              />
            )}
            {referenceImages.length === 0 &&
              !form.allergen_nut_free && !form.allergen_dairy_free && !form.allergen_egg_free && !form.allergen_raw_sugar && !form.allergen_other && (
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No extra details added.</p>
            )}
          </section>

          {/* When & How summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <SummaryHeader label="When & How" onEdit={() => jumpToStep(4)} />
            <DetailRow label="Event Date" value={form.event_date ? formatDate(form.event_date) : ''} mono />
            {form.pickup_time && <DetailRow label="Time" value={form.pickup_time} />}
            <DetailRow label="Method" value={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} />
          </section>

          {/* Delivery Address summary — only exists as its own step (and section) when delivering */}
          {deliveryType === 'delivery' && (
            <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <SummaryHeader label="Delivery Address" onEdit={() => jumpToStep(ADDRESS_STEP)} />
              {form.address_governorate && <DetailRow label="Governorate" value={GOVERNORATES.find(g => g.value === form.address_governorate)?.label ?? form.address_governorate} />}
              {form.address_area && <DetailRow label="Area" value={form.address_area} />}
              {form.address_block && <DetailRow label="Block" value={form.address_block} />}
              {form.address_street && <DetailRow label="Street" value={form.address_street} />}
              {form.address_house_no && <DetailRow label="House No." value={form.address_house_no} />}
              {form.address_extra_notes && <DetailRow label="Notes" value={form.address_extra_notes} dir="auto" />}
              {form.address_location_link && <DetailRow label="Maps Pin" value={form.address_location_link} />}
            </section>
          )}

          {serverError && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              {serverError}
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            We&apos;ll review your inquiry and send a confirmation link on WhatsApp, usually within a few hours.
          </p>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Error display (data-entry steps, before Review) */}
      {serverError && step < reviewStep && (
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
            onClick={() => { setServerError(null); goToStep(step - 1, -1) }}
          >
            Back
          </Button>
        )}
        {/* The explicit `key`s here are load-bearing, not decorative. Without them, React
            sees the same component type ("Button") at the same tree position on both
            sides of this ternary and reconciles them as one instance — patching the
            existing <button>'s `type` attribute from "button" to "submit" in place
            rather than unmounting/remounting a fresh node. That patch happens moments
            after the *same* click that just activated the Next button (inside
            advanceStep's post-`await trigger()` continuation), and was verified (via a
            real Playwright mouse click AND a keyboard Tab+Enter activation, both
            reproducing every time; a raw `element.click()` did not) to make that click —
            the ordinary "Next" press that carries the wizard from When&How into
            Review — also fire a genuine, silent form submission. A customer would never
            see Review or press "Send My Order"; the order would already be POSTed.
            Giving the two branches distinct keys forces React to unmount the old
            type="button" node and mount a brand-new type="submit" node instead of
            mutating one into the other, which removes the shared-node window entirely. */}
        {step < reviewStep ? (
          <Button key="next" type="button" size="lg" className="flex-1 rounded-xl" onClick={advanceStep}>
            Next
          </Button>
        ) : (
          <Button key="submit" type="submit" size="lg" className="flex-1 rounded-xl" loading={submitting}>
            {submitting ? 'Sending…' : 'Send My Inquiry'}
          </Button>
        )}
      </div>
    </form>
  )
}

function SummaryHeader({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-xs font-medium shrink-0 min-h-11 px-2 -my-2"
        style={{ color: 'var(--color-ink-secondary)' }}
      >
        <PencilSimple size={13} weight="bold" />
        Edit
      </button>
    </div>
  )
}
