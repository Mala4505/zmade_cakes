'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmInquiry } from '@/lib/actions/inquiries'
import { customerConfirmSchema } from '@/lib/validations/confirm'
import { CheckCircle, ArrowClockwise, WarningCircle, PencilSimple, X } from '@phosphor-icons/react'
import { GOVERNORATE_LABELS, formatTime, formatAddress } from '@/lib/utils'
import { Field, Input, Textarea, Select } from '@/components/ui'

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
}

const GOVERNORATES = Object.entries(GOVERNORATE_LABELS) as [string, string][]

type ConfirmAction = 'confirm' | 'request_changes'

export default function ConfirmForm({
  token,
  deliveryType,
  currentPickupTime,
  currentMessageOnCake,
  currentSpecialRequirements,
  existingAddress,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [requestSent, setRequestSent] = useState(false)
  const [editing, setEditing] = useState(false)

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

  function submit(action: ConfirmAction) {
    setError(null)

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
    startTransition(async () => {
      const result = await confirmInquiry(token, parsed.data)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.fieldErrors) {
        setError('Please check your details and try again.')
        return
      }
      if (action === 'request_changes') {
        setRequestSent(true)
        return
      }
      if (result.data?.order?.tracking_token) {
        router.push(`/track/${result.data.order.tracking_token}`)
      }
    })
  }

  if (requestSent) {
    return (
      <div
        className="rounded-2xl border p-6 flex flex-col items-center gap-3 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <CheckCircle size={40} weight="fill" style={{ color: 'var(--color-success)' }} />
        <p className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          Request Sent
        </p>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          We've been notified of your request and will get back to you shortly on WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Editable fields */}
      <section
        className="rounded-2xl border p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-ink-muted)' }}
          >
            Your Preferences
          </h2>
          <button
            type="button"
            onClick={() => (editing ? cancelEdit() : setEditing(true))}
            className="inline-flex items-center gap-1 text-xs font-medium shrink-0"
            style={{ color: 'var(--color-teal)' }}
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
            <PreferenceRow
              label="Pickup / Delivery Time"
              value={pickupTime ? formatTime(pickupTime) : 'Not set'}
            />
            <PreferenceRow label="Message on Cake" value={messageOnCake || 'Not set'} />
            <PreferenceRow label="Special Requirements" value={specialRequirements || 'Not set'} />
            {deliveryType === 'delivery' && (
              <PreferenceRow
                label="Delivery Address"
                value={
                  governorate
                    ? formatAddress({ governorate, area, block, street, house_no: houseNo })
                    : 'Not provided yet'
                }
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
          <Input
            id="confirm-pickup-time"
            type="time"
            value={pickupTime}
            onChange={(e) => {
              setPickupTime(e.target.value)
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
            placeholder="e.g. Happy Birthday Sarah!"
            aria-invalid={fieldErrors['message_on_cake'] ? true : undefined}
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
                placeholder="e.g. Salmiya"
                aria-invalid={fieldErrors['delivery_address.area'] ? true : undefined}
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
        <button
          type="button"
          onClick={() => submit('confirm')}
          disabled={pending}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
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
        </button>

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

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>{label}</p>
      <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--color-ink-secondary)' }}>
        {value}
      </p>
    </div>
  )
}
