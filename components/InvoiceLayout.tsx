import { formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import type { DeliveryType } from '@/lib/supabase/types'

interface Props {
  order: {
    id: string
    final_price: string
    deposit_amount: string | null
    delivery_type: DeliveryType
    tracking_token: string
    invoice_number?: number | null
  }
  invoiceNumber?: number | null
  businessPhone?: string
  businessInstagram?: string
  inquiry: {
    customer_name: string
    customer_phone: string
    order_type?: 'cake' | 'other_item'
    item_name: string
    cake_size: string
    flavor: string
    theme?: string
    occasion?: string
    message_on_cake?: string
    quantity: number
    event_date: string
    pickup_time: string | null
    admin_price: string | null
    discount: string | null
    fully_paid: boolean
    payment_method: string
    special_requirements?: string
    allergen_nut_free: boolean
    allergen_dairy_free: boolean
    allergen_egg_free: boolean
    allergen_raw_sugar: boolean
    allergen_other: string
    delivery_address?: {
      governorate: string
      area: string
      block: string
      street: string
      house_no: string
      extra_notes?: string
    } | null
  }
  adminMode: boolean
}

export default function InvoiceLayout({ order, inquiry, adminMode, businessPhone, businessInstagram, invoiceNumber }: Props) {
  const deliveryAddr = order.delivery_type === 'delivery' && inquiry.delivery_address
    ? [
        GOVERNORATE_LABELS[inquiry.delivery_address.governorate as keyof typeof GOVERNORATE_LABELS],
        inquiry.delivery_address.area,
        `Block ${inquiry.delivery_address.block}`,
        inquiry.delivery_address.street,
        inquiry.delivery_address.house_no,
        inquiry.delivery_address.extra_notes,
      ]
        .filter(Boolean)
        .join(', ')
    : null

  const allergenList = Object.entries(ALLERGEN_LABELS)
    .filter(([key]) => inquiry[key as keyof typeof ALLERGEN_LABELS])
    .map(([, label]) => label)
  if (inquiry.allergen_other) allergenList.push(inquiry.allergen_other)

  const total = parseFloat(order.final_price) || 0
  const deposit = order.deposit_amount ? parseFloat(order.deposit_amount) : null
  const balance = balanceOwed(order.final_price, order.deposit_amount, inquiry.fully_paid)
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, order.deposit_amount)
  const hasDiscount = Number(inquiry.discount) > 0

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-[var(--shadow-floating)]"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        maxWidth: 560,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* Teal accent bar */}
      <div style={{ height: 4, backgroundColor: 'var(--color-teal)', width: '100%' }} />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex justify-between items-start">
        <div>
          <p
            className="text-xl font-extrabold tracking-tight"
            style={{ color: 'var(--color-teal)', fontFamily: 'var(--font-display)' }}
          >
            {BRAND_NAME}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            Handcrafted with love
          </p>
        </div>
        <div>
          <p
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-border)', letterSpacing: '0.2em' }}
          >
            INVOICE
          </p>
          {(invoiceNumber ?? order.invoice_number) && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
            >
              {`ZM-${new Date().getFullYear()}-${String(invoiceNumber ?? order.invoice_number).padStart(4, '0')}`}
            </p>
          )}
        </div>
      </div>

      {/* Contact line */}
      {(businessInstagram || businessPhone) && (
        <div className="px-6 pb-3">
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            {[businessInstagram, businessPhone].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />

      {/* Order Details section */}
      <div className="px-6 pt-4 pb-2">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Order Details
        </p>

        <InvRow label="Customer" value={inquiry.customer_name} />
        <InvRow label="Phone" value={inquiry.customer_phone} mono />

        <div style={{ borderTop: '1px dashed var(--color-border)', margin: '10px 0' }} />

        <InvRow label="Event Date" value={formatDate(inquiry.event_date)} mono />
        {inquiry.pickup_time && (
          <InvRow label="Time" value={formatTime(inquiry.pickup_time)} mono />
        )}
        <InvRow
          label="Delivery"
          value={order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
        />
        {deliveryAddr && (
          <InvRow label="Address" value={deliveryAddr} />
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />

      {/* Cake Details section */}
      <div className="px-6 pt-4 pb-2">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Cake Details
        </p>

        {inquiry.order_type === 'other_item' ? (
          <>
            <InvRow label="Item" value={inquiry.item_name} />
            {inquiry.cake_size && <InvRow label="Size" value={inquiry.cake_size} />}
          </>
        ) : (
          <>
            <InvRow label="Size" value={inquiry.cake_size} />
            <InvRow label="Flavor" value={inquiry.flavor} />
            {inquiry.theme && <InvRow label="Theme" value={inquiry.theme} />}
            {inquiry.occasion && <InvRow label="Occasion" value={inquiry.occasion} />}
            {inquiry.message_on_cake && (
              <InvRow label="Message" value={`"${inquiry.message_on_cake}"`} />
            )}
          </>
        )}
        <InvRow label="Quantity" value={String(inquiry.quantity)} mono />
        {inquiry.special_requirements && (
          <InvRow label="Notes" value={inquiry.special_requirements} />
        )}
      </div>

      {/* Allergens */}
      {hasAllergens(inquiry) && allergenList.length > 0 && (
        <>
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />
          <div className="px-6 pt-4 pb-2">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-ink-muted)' }}
            >
              Dietary Requirements
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allergenList.map((label) => (
                <span
                  key={label}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    border: '1px solid #f59e0b',
                    color: '#92400e',
                    backgroundColor: '#fffbeb',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 24px' }} />

      {/* Payment section */}
      <div className="px-6 pt-4 pb-5">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Payment
        </p>

        {hasDiscount && (
          <>
            <InvRow label="Subtotal" value={formatKWD(inquiry.admin_price)} mono />
            <InvRow label="Discount" value={`- ${formatKWD(inquiry.discount)}`} mono />
          </>
        )}

        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
            Total
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
          >
            {formatKWD(order.final_price)}
          </span>
        </div>

        {deposit !== null && (
          <InvRow label="Deposit" value={formatKWD(String(deposit))} mono />
        )}

        {paymentStatus === 'paid' ? (
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Balance</span>
            <span
              className="text-sm font-semibold"
              style={{ color: '#16a34a' }}
            >
              Fully Paid
            </span>
          </div>
        ) : (
          <InvRow label="Balance Due" value={formatKWD(String(balance))} mono />
        )}

        {inquiry.payment_method && (
          <InvRow
            label="Payment Method"
            value={inquiry.payment_method === 'wamd' ? 'WAMD' : 'Cash'}
          />
        )}
      </div>

      {/* Footer note */}
      <div
        className="px-6 py-4 text-center text-xs leading-relaxed"
        style={{
          borderTop: '1px dashed var(--color-border)',
          color: 'var(--color-ink-muted)',
        }}
      >
        Once the order is booked and confirmed, no further<br />
        cancellations or changes will be accepted.
      </div>
    </div>
  )
}

function InvRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-4 mb-1.5">
      <span className="text-xs pt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <span
        className="text-sm text-right"
        style={{
          color: 'var(--color-ink-secondary)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}
