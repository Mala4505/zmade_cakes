'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PhoneInput from '@/components/PhoneInput'

interface Option { id: string; name: string }
interface Blackout { id: string; date_from: string; date_to: string; reason: string }
interface Props {
  flavors: Option[]
  sizes: Option[]
  occasions: Option[]
  themes: Option[]
  decorations: Option[]
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

export default function OrderForm({ flavors, sizes, occasions, themes, decorations, blackouts, minLeadDays }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    cake_size: '',
    flavor: '',
    occasion: '',
    theme: '',
    decoration_style: '',
    message_on_cake: '',
    special_requirements: '',
    allergen_nut_free: false,
    allergen_gluten_free: false,
    allergen_dairy_free: false,
    allergen_egg_free: false,
    allergen_halal: false,
    allergen_other: '',
    event_date: '',
    pickup_time: '',
    delivery_type: 'pickup' as 'pickup' | 'delivery',
    address_governorate: 'capital',
    address_area: '',
    address_block: '',
    address_street: '',
    address_house_no: '',
    address_extra_notes: '',
  })

  const update = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }))

  const inputCls = 'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all'
  const inputStyle = { backgroundColor: 'var(--color-cream)', borderColor: 'var(--color-border)', color: 'var(--color-ink)' }
  const labelCls = 'block text-xs font-medium mb-1.5'
  const labelStyle = { color: 'var(--color-ink-secondary)' }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'public_form' }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Something went wrong. Please try again.'); return }
      router.push('/order/success')
    } catch { setError('Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  const advanceStep = () => {
    if (step === 1) {
      if (!form.customer_name.trim() || !form.customer_phone.trim()) {
        setError('Please fill in your name and phone number.')
        return
      }
    }
    if (step === 2) {
      if (!form.cake_size || !form.flavor || !form.decoration_style) {
        setError('Please select size, flavor, and decoration style.')
        return
      }
    }
    if (step === 3) {
      if (!form.event_date) {
        setError('Please select your event date.')
        return
      }
      if (isDateBlackedOut(form.event_date, blackouts)) {
        setError('This date is not available. Please choose another date.')
        return
      }
    }
    setError(null)
    setStep(s => s + 1)
  }

  const dateBlackedOut = isDateBlackedOut(form.event_date, blackouts)

  return (
    <div>
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

      {/* Step 1 — Who are you? */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Let's start with you</h2>
          <div>
            <label className={labelCls} style={labelStyle}>Your Name *</label>
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              value={form.customer_name}
              onChange={e => update('customer_name', e.target.value)}
              placeholder="e.g. Sara Al-Qatami"
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Phone Number *</label>
            <PhoneInput
              value={form.customer_phone}
              onChange={value => setForm(prev => ({ ...prev, customer_phone: value }))}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Your Cake */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Tell us about your cake</h2>

          {/* Size pills */}
          <div>
            <label className={labelCls} style={labelStyle}>Cake Size *</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update('cake_size', s.name)}
                  className="px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all"
                  style={{
                    backgroundColor: form.cake_size === s.name ? 'var(--color-teal)' : 'var(--color-surface)',
                    borderColor: form.cake_size === s.name ? 'var(--color-teal)' : 'var(--color-border)',
                    color: form.cake_size === s.name ? 'var(--color-cream)' : 'var(--color-ink-secondary)',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Flavor */}
          <div>
            <label className={labelCls} style={labelStyle}>Flavor *</label>
            <select className={inputCls} style={inputStyle} value={form.flavor} onChange={e => update('flavor', e.target.value)}>
              <option value="">Select a flavor…</option>
              {flavors.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>

          {/* Occasion */}
          <div>
            <label className={labelCls} style={labelStyle}>Occasion</label>
            <select className={inputCls} style={inputStyle} value={form.occasion} onChange={e => update('occasion', e.target.value)}>
              <option value="">Select an occasion…</option>
              {occasions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className={labelCls} style={labelStyle}>Theme</label>
            <select className={inputCls} style={inputStyle} value={form.theme} onChange={e => update('theme', e.target.value)}>
              <option value="">Select a theme…</option>
              {themes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          {/* Decoration Style */}
          <div>
            <label className={labelCls} style={labelStyle}>Decoration Style *</label>
            <select className={inputCls} style={inputStyle} value={form.decoration_style} onChange={e => update('decoration_style', e.target.value)}>
              <option value="">Select decoration style…</option>
              {decorations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          {/* Message on Cake */}
          <div>
            <label className={labelCls} style={labelStyle}>Message on Cake</label>
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              value={form.message_on_cake}
              onChange={e => update('message_on_cake', e.target.value)}
              placeholder="e.g. Happy Birthday Sara!"
            />
          </div>

          {/* Allergens */}
          <div>
            <label className={labelCls} style={labelStyle}>Dietary Requirements</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { field: 'allergen_nut_free', label: 'Nut-free' },
                { field: 'allergen_gluten_free', label: 'Gluten-free' },
                { field: 'allergen_dairy_free', label: 'Dairy-free' },
                { field: 'allergen_egg_free', label: 'Egg-free' },
                { field: 'allergen_halal', label: 'Halal-certified' },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form[field as keyof typeof form] as boolean}
                    onChange={e => update(field, e.target.checked)}
                    className="rounded"
                    style={{ accentColor: 'var(--color-teal)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                className={inputCls}
                style={inputStyle}
                value={form.allergen_other}
                onChange={e => update('allergen_other', e.target.value)}
                placeholder="Other dietary notes…"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — When & How? */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>When do you need it?</h2>

          {/* Event Date */}
          <div>
            <label className={labelCls} style={labelStyle}>Event Date *</label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={form.event_date}
              min={getMinDate(minLeadDays)}
              onChange={e => update('event_date', e.target.value)}
            />
            {form.event_date && dateBlackedOut && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
                This date is not available. Please choose another date.
              </p>
            )}
          </div>

          {/* Pickup Time */}
          <div>
            <label className={labelCls} style={labelStyle}>Preferred Pickup / Delivery Time</label>
            <input
              type="time"
              className={inputCls}
              style={inputStyle}
              value={form.pickup_time}
              onChange={e => update('pickup_time', e.target.value)}
            />
          </div>

          {/* Delivery Type */}
          <div>
            <label className={labelCls} style={labelStyle}>Collection Method</label>
            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'delivery'] as const).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => update('delivery_type', val)}
                  className="rounded-xl border p-4 text-left transition-all"
                  style={{
                    borderColor: form.delivery_type === val ? 'var(--color-teal)' : 'var(--color-border)',
                    backgroundColor: form.delivery_type === val ? 'var(--color-teal-light)' : 'var(--color-surface)',
                  }}
                >
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--color-ink)' }}>{val}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Address fields (delivery only) */}
          {form.delivery_type === 'delivery' && (
            <div className="flex flex-col gap-4 pt-1">
              <div>
                <label className={labelCls} style={labelStyle}>Governorate</label>
                <select className={inputCls} style={inputStyle} value={form.address_governorate} onChange={e => update('address_governorate', e.target.value)}>
                  {GOVERNORATES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={labelStyle}>Area</label>
                  <input type="text" className={inputCls} style={inputStyle} value={form.address_area} onChange={e => update('address_area', e.target.value)} placeholder="Area" />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>Block</label>
                  <input type="text" className={inputCls} style={inputStyle} value={form.address_block} onChange={e => update('address_block', e.target.value)} placeholder="Block" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={labelStyle}>Street</label>
                  <input type="text" className={inputCls} style={inputStyle} value={form.address_street} onChange={e => update('address_street', e.target.value)} placeholder="Street" />
                </div>
                <div>
                  <label className={labelCls} style={labelStyle}>House / Apartment No.</label>
                  <input type="text" className={inputCls} style={inputStyle} value={form.address_house_no} onChange={e => update('address_house_no', e.target.value)} placeholder="No." />
                </div>
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Extra Notes</label>
                <input type="text" className={inputCls} style={inputStyle} value={form.address_extra_notes} onChange={e => update('address_extra_notes', e.target.value)} placeholder="Floor, apartment name, landmark…" />
              </div>
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
            <SummaryRow label="Name" value={form.customer_name} />
            <SummaryRow label="Phone" value={form.customer_phone} />
          </section>

          {/* Cake summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-muted)' }}>Cake</p>
            <SummaryRow label="Size" value={form.cake_size} />
            <SummaryRow label="Flavor" value={form.flavor} />
            {form.occasion && <SummaryRow label="Occasion" value={form.occasion} />}
            {form.theme && <SummaryRow label="Theme" value={form.theme} />}
            <SummaryRow label="Decoration" value={form.decoration_style} />
            {form.message_on_cake && <SummaryRow label="Message" value={form.message_on_cake} />}
            {(form.allergen_nut_free || form.allergen_gluten_free || form.allergen_dairy_free || form.allergen_egg_free || form.allergen_halal || form.allergen_other) && (
              <SummaryRow
                label="Dietary"
                value={[
                  form.allergen_nut_free && 'Nut-free',
                  form.allergen_gluten_free && 'Gluten-free',
                  form.allergen_dairy_free && 'Dairy-free',
                  form.allergen_egg_free && 'Egg-free',
                  form.allergen_halal && 'Halal',
                  form.allergen_other || '',
                ].filter(Boolean).join(', ')}
              />
            )}
          </section>

          {/* Delivery summary */}
          <section className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-ink-muted)' }}>Delivery</p>
            <SummaryRow label="Event Date" value={form.event_date} />
            {form.pickup_time && <SummaryRow label="Time" value={form.pickup_time} />}
            <SummaryRow label="Method" value={form.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} />
            {form.delivery_type === 'delivery' && (
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

          {/* Special requirements */}
          <div>
            <label className={labelCls} style={labelStyle}>Any other notes or special requests?</label>
            <textarea
              className={inputCls}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              value={form.special_requirements}
              onChange={e => update('special_requirements', e.target.value)}
              placeholder="Anything else Zainab should know…"
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Error display (steps 1-3) */}
      {error && step < 4 && (
        <p className="mt-4 text-sm rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={() => { setError(null); setStep(s => s - 1) }}
            type="button"
            className="flex-1 py-3 rounded-xl text-sm font-medium border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-ink-secondary)' }}
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={advanceStep}
            type="button"
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
            className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {submitting ? 'Sending…' : 'Send My Order'}
          </button>
        )}
      </div>
    </div>
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
