'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmInquiry } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { customerConfirmSchema, type CustomerConfirmData } from '@/lib/validations/confirm'
import { CheckCircle, ArrowClockwise, WarningCircle, PencilSimple, X, WhatsappLogo } from '@phosphor-icons/react'
import { GOVERNORATE_LABELS, formatTime, formatAddress } from '@/lib/utils'
import { holdMinimumVisible } from '@/lib/motion'
import { DetailRow, Field, Input, Textarea, Select, Button, CakeLoader, TimeScrollPicker } from '@/components/ui'

type Address = {
  governorate: string
  area: string
  block: string
  street: string
  house_no: string
  extra_notes?: string
  location_link?: string
}

interface Props {
  token: string
  inquiryId: string
  deliveryType: string
  currentPickupTime: string | null
  currentMessageOnCake: string
  currentSpecialRequirements: string
  existingAddress: Address | null
  waUrl: string
  // Message on Cake / Special Requirements below always edit the order's first item only —
  // these describe that item for the reader when the order has more than one, so "Your
  // Preferences" doesn't read as if it covers everything in a multi-item order.
  firstItemLabel: string
  hasMultipleItems: boolean
}

const GOVERNORATES = Object.entries(GOVERNORATE_LABELS) as [string, string][]

type ConfirmAction = 'confirm' | 'request_changes'

const DRAFT_STORAGE_KEY = 'zmade-confirm-draft-v1'

interface ConfirmDraft {
  editing: boolean
  pickupTime: string
  messageOnCake: string
  specialRequirements: string
  customerComments: string
  governorate: string
  area: string
  block: string
  street: string
  houseNo: string
  extraNotes: string
  locationLink: string
}

export default function ConfirmForm({
  token,
  deliveryType,
  currentPickupTime,
  currentMessageOnCake,
  currentSpecialRequirements,
  existingAddress,
  waUrl,
  firstItemLabel,
  hasMultipleItems,
}: Props) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null)
  // Confirm success stashes the tracking token here so `onSuccess` (which takes no
  // args) can route to /track once the write transition has settled.
  const trackingTokenRef = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [requestSent, setRequestSent] = useState(false)
  const requestSentHeadingRef = useRef<HTMLParagraphElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const [pickupTime, setPickupTime] = useState(currentPickupTime ?? '')
  const [messageOnCake, setMessageOnCake] = useState(currentMessageOnCake)
  const [specialRequirements, setSpecialRequirements] = useState(currentSpecialRequirements)
  const [customerComments, setCustomerComments] = useState('')

  const [governorate, setGovernorate] = useState(existingAddress?.governorate ?? '')
  const [area, setArea] = useState(existingAddress?.area ?? '')
  const [block, setBlock] = useState(existingAddress?.block ?? '')
  const [street, setStreet] = useState(existingAddress?.street ?? '')
  const [houseNo, setHouseNo] = useState(existingAddress?.house_no ?? '')
  const [extraNotes, setExtraNotes] = useState(existingAddress?.extra_notes ?? '')
  const [locationLink, setLocationLink] = useState(existingAddress?.location_link ?? '')

  // Token-scoped so one customer's in-progress edits never leak into a different
  // order opened in the same browser/session.
  const draftKey = `${DRAFT_STORAGE_KEY}:${token}`
  const draftSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore an in-progress draft (e.g. after WhatsApp's in-app browser evicts the tab).
  useEffect(() => {
    if (requestSent) return
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (!raw) return
      const draft: ConfirmDraft = JSON.parse(raw)
      setEditing(draft.editing)
      setPickupTime(draft.pickupTime)
      setMessageOnCake(draft.messageOnCake)
      setSpecialRequirements(draft.specialRequirements)
      setCustomerComments(draft.customerComments)
      setGovernorate(draft.governorate)
      setArea(draft.area)
      setBlock(draft.block)
      setStreet(draft.street)
      setHouseNo(draft.houseNo)
      setExtraNotes(draft.extraNotes)
      setLocationLink(draft.locationLink)
      setDraftRestored(true)
    } catch {
      // Corrupt or stale draft — ignore and start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (requestSent) return
    if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    draftSaveTimeout.current = setTimeout(() => {
      const draft: ConfirmDraft = {
        editing,
        pickupTime,
        messageOnCake,
        specialRequirements,
        customerComments,
        governorate,
        area,
        block,
        street,
        houseNo,
        extraNotes,
        locationLink,
      }
      sessionStorage.setItem(draftKey, JSON.stringify(draft))
    }, 400)
    return () => {
      if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current)
    }
  }, [
    editing,
    pickupTime,
    messageOnCake,
    specialRequirements,
    customerComments,
    governorate,
    area,
    block,
    street,
    houseNo,
    extraNotes,
    locationLink,
    requestSent,
    draftKey,
  ])

  // Move focus to the success panel when the form is replaced by it, so
  // screen-reader users get an announcement instead of silence.
  useEffect(() => {
    if (requestSent) requestSentHeadingRef.current?.focus()
  }, [requestSent])

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function cancelEdit() {
    setPickupTime(currentPickupTime ?? '')
    setMessageOnCake(currentMessageOnCake)
    setSpecialRequirements(currentSpecialRequirements)
    setGovernorate(existingAddress?.governorate ?? '')
    setArea(existingAddress?.area ?? '')
    setBlock(existingAddress?.block ?? '')
    setStreet(existingAddress?.street ?? '')
    setHouseNo(existingAddress?.house_no ?? '')
    setExtraNotes(existingAddress?.extra_notes ?? '')
    setLocationLink(existingAddress?.location_link ?? '')
    setFieldErrors({})
    setEditing(false)
  }

  function buildPayload(action: ConfirmAction) {
    const base = {
      pickup_time: pickupTime || null,
      message_on_cake: messageOnCake,
      special_requirements: specialRequirements,
      customer_comments: customerComments,
      action,
    }
    const addressStarted = [governorate, area, block, street, houseNo].some(
      (v) => v.trim() !== ''
    )
    // Confirming a delivery order requires a complete address; a change
    // request only validates the address if the customer started filling it.
    if (deliveryType === 'delivery' && (action === 'confirm' || addressStarted)) {
      return {
        ...base,
        delivery_address: {
          governorate,
          area,
          block,
          street,
          house_no: houseNo,
          extra_notes: extraNotes,
          location_link: locationLink,
        },
      }
    }
    return base
  }

  // The one place the confirm / request-changes server call and its result
  // mapping lives, shared by both useAsyncAction sites below. Field errors and
  // business-rule errors are shown in the inline banner (`error` state), so the
  // caller returns `false` — a silent stop, no toast.
  async function callConfirm(data: CustomerConfirmData) {
    const result = await confirmInquiry(token, data)
    if (result.fieldErrors) {
      setPendingAction(null)
      setError('Please check your details and try again.')
      return false
    }
    if (result.error) {
      setPendingAction(null)
      setError(result.error)
      return false
    }
    return { data: result.data }
  }

  const confirmSubmit = useAsyncAction(
    async (data: CustomerConfirmData, startedAt: number) => {
      const r = await callConfirm(data)
      if (!r) return false
      if (!r.data?.order?.tracking_token) {
        // Server said success but gave us nothing to navigate to — surface it as an
        // error rather than showing "Order confirmed" and leaving the full-screen
        // loader (driven by pendingAction) spinning forever with no way out.
        setPendingAction(null)
        setError('Something went wrong confirming your order. Please try again or contact us.')
        return false
      }
      await holdMinimumVisible(startedAt, 1400)
      sessionStorage.removeItem(draftKey)
      trackingTokenRef.current = r.data.order.tracking_token
    },
    {
      successToast: 'Order confirmed',
      onSuccess: () => {
        if (trackingTokenRef.current) router.push(`/track/${trackingTokenRef.current}`)
      },
    }
  )

  const requestChangesSubmit = useAsyncAction(
    async (data: CustomerConfirmData, startedAt: number) => {
      const r = await callConfirm(data)
      if (!r) return false
      await holdMinimumVisible(startedAt, 1400)
      sessionStorage.removeItem(draftKey)
      setPendingAction(null)
      setRequestSent(true)
    },
    { successToast: 'Change request sent' }
  )

  const pending = confirmSubmit.pending || requestChangesSubmit.pending

  // useAsyncAction owns the toast on a thrown submit, but it can't clear this
  // component's full-screen <CakeLoader> (driven by `pendingAction`). Clear it
  // here whenever either action surfaces an error.
  useEffect(() => {
    if (confirmSubmit.error || requestChangesSubmit.error) setPendingAction(null)
  }, [confirmSubmit.error, requestChangesSubmit.error])

  function submit(action: ConfirmAction) {
    setError(null)

    if (action === 'request_changes') {
      const addressChanged =
        deliveryType === 'delivery' &&
        (governorate !== (existingAddress?.governorate ?? '') ||
          area !== (existingAddress?.area ?? '') ||
          block !== (existingAddress?.block ?? '') ||
          street !== (existingAddress?.street ?? '') ||
          houseNo !== (existingAddress?.house_no ?? '') ||
          extraNotes !== (existingAddress?.extra_notes ?? '') ||
          locationLink !== (existingAddress?.location_link ?? ''))
      const hasChange =
        customerComments.trim().length > 0 ||
        pickupTime !== (currentPickupTime ?? '') ||
        messageOnCake !== currentMessageOnCake ||
        specialRequirements !== currentSpecialRequirements ||
        addressChanged
      if (!hasChange) {
        setFieldErrors({ customer_comments: "Let us know what you'd like changed, or add a message for us." })
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        })
        return
      }
    }

    const parsed = customerConfirmSchema.safeParse(buildPayload(action))
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        if (!next[key]) next[key] = issue.message
      }
      setFieldErrors(next)
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    setFieldErrors({})
    setPendingAction(action)
    const startedAt = Date.now()
    if (action === 'confirm') confirmSubmit.run(parsed.data, startedAt)
    else requestChangesSubmit.run(parsed.data, startedAt)
  }

  if (pendingAction) {
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
        <CakeLoader
          size={110}
          label={pendingAction === 'confirm' ? 'Confirming your order…' : 'Sending your request…'}
        />
      </div>
    )
  }

  if (requestSent) {
    return (
      <div
        className="rounded-2xl border p-6 flex flex-col items-center gap-3 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        aria-live="polite"
      >
        <CheckCircle size={40} weight="fill" style={{ color: 'var(--color-success)' }} />
        <p
          ref={requestSentHeadingRef}
          tabIndex={-1}
          className="font-semibold outline-none"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          Request Sent
        </p>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          We've been notified of your request and will get back to you shortly on WhatsApp.
        </p>
        {waUrl && (
          <Button
            href={waUrl}
            variant="primary"
            size="lg"
            className="w-full mt-1"
          >
            <WhatsappLogo size={16} weight="fill" />
            Message us on WhatsApp
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Draft restored notice */}
      {draftRestored && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          <ArrowClockwise size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">Draft restored. Your changes are still here.</span>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            aria-label="Dismiss"
            className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 -my-2"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Editable fields */}
      <section
        className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Your Preferences
            </h2>
            {hasMultipleItems && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>
                Message &amp; special requirements for your {firstItemLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => (editing ? cancelEdit() : setEditing(true))}
            className="inline-flex items-center gap-1 text-xs font-medium shrink-0 min-h-11 px-2 -mx-2 -my-2"
            style={{ color: 'var(--color-ink-secondary)' }}
          >
            {editing ? (
              <>
                <X size={13} weight="bold" />
                Cancel
              </>
            ) : (
              <>
                <PencilSimple size={13} weight="bold" />
                Edit
              </>
            )}
          </button>
        </div>

        {/* Read-only view — the default. Editing is opt-in so nothing looks half-open
            or ambiguous about what's actually set vs. just rendered in an input. */}
        {!editing && (
          <div className="flex flex-col gap-3">
            {pickupTime && (
              <DetailRow label="Pickup / Delivery Time" value={formatTime(pickupTime)} layout="stacked" />
            )}
            {messageOnCake && (
              <DetailRow label="Message on Cake" value={messageOnCake} layout="stacked" />
            )}
            {specialRequirements && (
              <DetailRow label="Special Requirements" value={specialRequirements} layout="stacked" />
            )}
            {deliveryType === 'delivery' && (
              <DetailRow
                label="Delivery Address"
                value={
                  governorate
                    ? formatAddress({ governorate, area, block, street, house_no: houseNo })
                    : 'Add your delivery address'
                }
                layout="stacked"
              />
            )}
          </div>
        )}

        {editing && (
        <>
        {/* Pickup time */}
        <Field
          label="Pickup / Delivery Time"
          htmlFor="confirm-pickup-time"
          error={fieldErrors['pickup_time']}
        >
          <TimeScrollPicker
            id="confirm-pickup-time"
            value={pickupTime}
            onChange={(v) => {
              setPickupTime(v)
              clearFieldError('pickup_time')
            }}
            aria-invalid={fieldErrors['pickup_time'] ? true : undefined}
          />
        </Field>

        {/* Message on cake */}
        <Field
          label="Message on Cake"
          htmlFor="confirm-message-on-cake"
          hint="Max 255 characters"
          error={fieldErrors['message_on_cake']}
        >
          <Input
            id="confirm-message-on-cake"
            type="text"
            value={messageOnCake}
            onChange={(e) => {
              setMessageOnCake(e.target.value)
              clearFieldError('message_on_cake')
            }}
            maxLength={255}
            aria-invalid={fieldErrors['message_on_cake'] ? true : undefined}
            dir="auto"
            size="base"
          />
        </Field>

        {/* Special requirements */}
        <Field
          label="Special Requirements"
          htmlFor="confirm-special-requirements"
          hint="Allergies, extra details, etc."
          error={fieldErrors['special_requirements']}
        >
          <Textarea
            id="confirm-special-requirements"
            value={specialRequirements}
            onChange={(e) => {
              setSpecialRequirements(e.target.value)
              clearFieldError('special_requirements')
            }}
            maxLength={1000}
            rows={3}
            placeholder="Any dietary requirements or special requests?"
            aria-invalid={fieldErrors['special_requirements'] ? true : undefined}
            dir="auto"
            size="base"
          />
        </Field>

        {/* Delivery address */}
        {deliveryType === 'delivery' && (
          <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Delivery Address
            </p>
            <Field
              label="Governorate"
              htmlFor="confirm-governorate"
              error={fieldErrors['delivery_address.governorate']}
            >
              <Select
                id="confirm-governorate"
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value)
                  clearFieldError('delivery_address.governorate')
                }}
                aria-invalid={fieldErrors['delivery_address.governorate'] ? true : undefined}
                size="base"
              >
                <option value="">Select governorate</option>
                {GOVERNORATES.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Area"
              htmlFor="confirm-area"
              error={fieldErrors['delivery_address.area']}
            >
              <Input
                id="confirm-area"
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value)
                  clearFieldError('delivery_address.area')
                }}
                aria-invalid={fieldErrors['delivery_address.area'] ? true : undefined}
                size="base"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Block"
                htmlFor="confirm-block"
                error={fieldErrors['delivery_address.block']}
              >
                <Input
                  id="confirm-block"
                  type="text"
                  value={block}
                  onChange={(e) => {
                    setBlock(e.target.value)
                    clearFieldError('delivery_address.block')
                  }}
                  aria-invalid={fieldErrors['delivery_address.block'] ? true : undefined}
                  size="base"
                />
              </Field>
              <Field
                label="Street"
                htmlFor="confirm-street"
                error={fieldErrors['delivery_address.street']}
              >
                <Input
                  id="confirm-street"
                  type="text"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value)
                    clearFieldError('delivery_address.street')
                  }}
                  aria-invalid={fieldErrors['delivery_address.street'] ? true : undefined}
                  size="base"
                />
              </Field>
            </div>
            <Field
              label="House / Flat Number"
              htmlFor="confirm-house-no"
              error={fieldErrors['delivery_address.house_no']}
            >
              <Input
                id="confirm-house-no"
                type="text"
                value={houseNo}
                onChange={(e) => {
                  setHouseNo(e.target.value)
                  clearFieldError('delivery_address.house_no')
                }}
                aria-invalid={fieldErrors['delivery_address.house_no'] ? true : undefined}
                size="base"
              />
            </Field>
            <Field
              label="Delivery Notes"
              htmlFor="confirm-extra-notes"
              hint="Optional"
              error={fieldErrors['delivery_address.extra_notes']}
            >
              <Input
                id="confirm-extra-notes"
                type="text"
                value={extraNotes}
                onChange={(e) => {
                  setExtraNotes(e.target.value)
                  clearFieldError('delivery_address.extra_notes')
                }}
                placeholder="Landmark, gate colour, etc."
                aria-invalid={fieldErrors['delivery_address.extra_notes'] ? true : undefined}
                dir="auto"
                size="base"
              />
            </Field>
            <Field
              label="Google Maps Pin"
              htmlFor="confirm-location-link"
              hint="Open Google Maps, drop a pin on your location, tap Share, and paste the link here."
              error={fieldErrors['delivery_address.location_link']}
            >
              <Input
                id="confirm-location-link"
                type="text"
                value={locationLink}
                onChange={(e) => {
                  setLocationLink(e.target.value)
                  clearFieldError('delivery_address.location_link')
                }}
                placeholder="https://maps.app.goo.gl/…"
                aria-invalid={fieldErrors['delivery_address.location_link'] ? true : undefined}
                size="base"
              />
            </Field>
          </div>
        )}
        </>
        )}
      </section>

      {/* Message for the team */}
      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <h2
          id="confirm-comments-label"
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Your Message
        </h2>
        <Textarea
          value={customerComments}
          onChange={(e) => {
            setCustomerComments(e.target.value)
            clearFieldError('customer_comments')
          }}
          maxLength={2000}
          rows={4}
          placeholder="Any questions or changes you'd like to discuss?"
          aria-labelledby="confirm-comments-label"
          aria-invalid={fieldErrors['customer_comments'] ? true : undefined}
          dir="auto"
          size="base"
        />
        {fieldErrors['customer_comments'] && (
          <p className="mt-1 text-xs text-[var(--color-danger)]">
            {fieldErrors['customer_comments']}
          </p>
        )}
      </section>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
        >
          <WarningCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={() => submit('confirm')}
          disabled={pending}
          variant="primary"
          size="lg"
          className="rounded-xl w-full py-3.5 font-semibold"
        >
          {pending ? (
            <>
              <ArrowClockwise size={16} className="animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CheckCircle size={16} weight="bold" />
              Confirm Order
            </>
          )}
        </Button>
        <p className="text-xs text-center -mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
          Need to change something after confirming? Message us on WhatsApp and we'll sort it out.
        </p>

        <button
          type="button"
          onClick={() => submit('request_changes')}
          disabled={pending}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-ink-secondary)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          Request Changes
        </button>
      </div>
    </div>
  )
}
