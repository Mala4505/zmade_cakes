'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmInquiry } from '@/lib/actions/inquiries'
import { CheckCircle, ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { GOVERNORATE_LABELS } from '@/lib/utils'

type Address = {
  governorate: string
  area: string
  block: string
  street: string
  house_no: string
  extra_notes?: string
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

const inputClass = 'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2'
const inputStyle = {
  borderColor: 'var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-ink-secondary)',
}

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
  const [requestSent, setRequestSent] = useState(false)

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

  function buildPayload(action: 'confirm' | 'request_changes') {
    const base = {
      pickup_time: pickupTime || null,
      message_on_cake: messageOnCake,
      special_requirements: specialRequirements,
      customer_comments: customerComments,
      action,
    }
    if (deliveryType === 'delivery' && governorate) {
      return { ...base, delivery_address: { governorate, area, block, street, house_no: houseNo, extra_notes: extraNotes } }
    }
    return base
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await confirmInquiry(token, buildPayload('confirm'))
      if (result.error) { setError(result.error); return }
      if (result.data?.order?.tracking_token) {
        router.push(`/track/${result.data.order.tracking_token}`)
      }
    })
  }

  function handleRequestChanges() {
    setError(null)
    startTransition(async () => {
      const result = await confirmInquiry(token, buildPayload('request_changes'))
      if (result.error) { setError(result.error); return }
      setRequestSent(true)
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
          Zainab has been notified of your request. She'll get back to you shortly on WhatsApp.
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
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Your Preferences
        </h2>

        {/* Pickup time */}
        <Field label="Pickup / Delivery Time">
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        {/* Message on cake */}
        <Field label="Message on Cake" hint="Max 255 characters">
          <input
            type="text"
            value={messageOnCake}
            onChange={(e) => setMessageOnCake(e.target.value)}
            maxLength={255}
            placeholder="e.g. Happy Birthday Sarah!"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        {/* Special requirements */}
        <Field label="Special Requirements" hint="Allergies, extra details, etc.">
          <textarea
            value={specialRequirements}
            onChange={(e) => setSpecialRequirements(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Any dietary requirements or special requests?"
            className={inputClass}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        {/* Delivery address */}
        {deliveryType === 'delivery' && (
          <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
              Delivery Address
            </p>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select Governorate</option>
              {GOVERNORATES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area"
              className={inputClass}
              style={inputStyle}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="Block"
                className={inputClass}
                style={inputStyle}
              />
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <input
              type="text"
              value={houseNo}
              onChange={(e) => setHouseNo(e.target.value)}
              placeholder="House / Flat number"
              className={inputClass}
              style={inputStyle}
            />
            <input
              type="text"
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Delivery notes (optional)"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}
      </section>

      {/* Comments for Zainab */}
      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Message for Zainab
        </h2>
        <textarea
          value={customerComments}
          onChange={(e) => setCustomerComments(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Any questions or changes you'd like to discuss?"
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
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
          onClick={handleConfirm}
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
          onClick={handleRequestChanges}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          {label}
        </label>
        {hint && (
          <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
