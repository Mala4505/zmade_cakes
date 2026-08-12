import { formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'

interface Props {
  order: {
    id: string
    final_price: string
    deposit_amount: string | null
    amount_paid: string | null
    delivery_charge: string | null
    delivery_type: string
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
}

export default function InvoicePrint({ order, inquiry, businessPhone, businessInstagram, invoiceNumber }: Props) {
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

  const deposit = order.deposit_amount ? parseFloat(order.deposit_amount) : null
  const amountPaid = order.amount_paid ? parseFloat(order.amount_paid) : null
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, order.amount_paid)
  const hasDiscount = Number(inquiry.discount) > 0
  const hasDeliveryCharge = order.delivery_type === 'delivery' && Number(order.delivery_charge) > 0

  return (
    <div id="invoice" className="print-only">
      <style>{`
        @media print {
          body { font-size: 12pt; margin: 0; }
          @page { margin: 14mm 12mm; }
          .no-print, header, nav, aside { display: none !important; }
          #invoice {
            font-family: var(--font-display), sans-serif;
            color: #111;
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            padding: 0;
          }
          .inv-accent { height: 3px; background: var(--color-teal); width: 100%; margin-bottom: 18px; }
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .inv-brand-block { display: flex; align-items: center; gap: 10px; }
          .inv-logo { width: 40px; height: 40px; flex-shrink: 0; object-fit: contain; }
          .inv-brand-name { font-size: 26px; font-weight: 800; letter-spacing: -0.3px; color: var(--color-teal); }
          .inv-tagline { font-size: 12px; color: #777; margin-top: 2px; }
          .inv-label-invoice { font-size: 30px; font-weight: 700; letter-spacing: 2px; color: #ccc; text-transform: uppercase; }
          .inv-divider { border-top: 1px dashed #ccc; margin: 8px 0; }
          .inv-divider-solid { border-top: 1px solid #e5e5e5; margin: 8px 0; }
          .inv-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13pt; }
          .inv-label { color: #777; }
          .inv-section-title { font-weight: 700; margin: 8px 0 4px; text-transform: uppercase; font-size: 11pt; letter-spacing: 0.8px; color: #444; }
          .inv-note { font-size: 10pt; color: #777; margin-top: 14px; text-align: center; line-height: 1.6; border-top: 1px dashed #ccc; padding-top: 8px; }
          .inv-allergen-row { margin: 4px 0; font-size: 13pt; }
          .inv-allergen-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
          .inv-allergen-tag { border: 1px solid #f59e0b; color: #92400e; font-size: 10pt; padding: 1px 6px; border-radius: 4px; }
          .inv-total-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13pt; }
          .inv-total-main { font-weight: 700; font-size: 17pt; }
          .inv-paid { color: #16a34a; font-weight: 700; font-size: 13pt; }
          .inv-mono { font-family: 'Courier New', monospace; }
          .inv-deposit-hint { font-size: 9pt; color: #777; margin-top: -2px; margin-bottom: 4px; }
          .inv-contact { text-align: center; font-size: 11pt; color: #555; margin-bottom: 10px; }
          .inv-invoice-number { font-family: 'Courier New', monospace; font-size: 9pt; color: #777; text-align: right; margin-top: 3px; }
        }
      `}</style>

      <div className="inv-accent" />

      <div className="inv-header">
        <div className="inv-brand-block">
          <img src="/logo.svg" alt="" className="inv-logo" />
          <div>
            <div className="inv-brand-name">{BRAND_NAME}</div>
            <div className="inv-tagline">Made with love</div>
          </div>
        </div>
        <div>
          <div className="inv-label-invoice">INVOICE</div>
          {(invoiceNumber ?? order.invoice_number) && (
            <div className="inv-invoice-number">
              {`ZM-${new Date().getFullYear()}-${String(invoiceNumber ?? order.invoice_number).padStart(4, '0')}`}
            </div>
          )}
        </div>
      </div>

      {(businessInstagram || businessPhone) && (
        <div className="inv-contact">
          {[businessInstagram, businessPhone].filter(Boolean).join(' · ')}
        </div>
      )}

      <div className="inv-divider" />
      <div className="inv-section-title">Order Details</div>
      <div className="inv-divider" />

      <div className="inv-row">
        <span className="inv-label">Customer:</span>
        <span>{inquiry.customer_name}</span>
      </div>
      <div className="inv-row">
        <span className="inv-label">Phone:</span>
        <span>{inquiry.customer_phone}</span>
      </div>

      <div className="inv-divider" />

      <div className="inv-row">
        <span className="inv-label">Event Date:</span>
        <span>{formatDate(inquiry.event_date)}</span>
      </div>
      {inquiry.pickup_time && (
        <div className="inv-row">
          <span className="inv-label">Time:</span>
          <span>{formatTime(inquiry.pickup_time)}</span>
        </div>
      )}

      <div className="inv-divider" />
      <div className="inv-section-title">Cake Details</div>

      {inquiry.order_type === 'other_item' ? (
        <>
          <div className="inv-row">
            <span className="inv-label">Item:</span>
            <span>{inquiry.item_name}</span>
          </div>
          {inquiry.cake_size && (
            <div className="inv-row">
              <span className="inv-label">Size:</span>
              <span>{inquiry.cake_size}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="inv-row">
            <span className="inv-label">Size:</span>
            <span>{inquiry.cake_size}</span>
          </div>
          <div className="inv-row">
            <span className="inv-label">Flavor:</span>
            <span>{inquiry.flavor}</span>
          </div>
          {inquiry.theme && (
            <div className="inv-row">
              <span className="inv-label">Theme:</span>
              <span>{inquiry.theme}</span>
            </div>
          )}
          {inquiry.occasion && (
            <div className="inv-row">
              <span className="inv-label">Occasion:</span>
              <span>{inquiry.occasion}</span>
            </div>
          )}
          {inquiry.message_on_cake && (
            <div className="inv-row">
              <span className="inv-label">Message:</span>
              <span>"{inquiry.message_on_cake}"</span>
            </div>
          )}
        </>
      )}
      <div className="inv-row">
        <span className="inv-label">Quantity:</span>
        <span>{inquiry.quantity}</span>
      </div>
      {inquiry.special_requirements && (
        <div className="inv-row">
          <span className="inv-label">Notes:</span>
          <span>{inquiry.special_requirements}</span>
        </div>
      )}

      {hasAllergens(inquiry) && (
        <>
          <div className="inv-divider" />
          <div className="inv-section-title">Dietary Requirements</div>
          <div className="inv-allergen-tags">
            {allergenList.map((label) => (
              <span key={label} className="inv-allergen-tag">{label}</span>
            ))}
          </div>
        </>
      )}

      <div className="inv-divider" />
      <div className="inv-section-title">Payment</div>

      <div className="inv-total-row">
        <span className="inv-label">Subtotal</span>
        <span className="inv-mono">{formatKWD(inquiry.admin_price)}</span>
      </div>
      {hasDiscount && (
        <div className="inv-total-row">
          <span className="inv-label">Discount</span>
          <span className="inv-mono">- {formatKWD(inquiry.discount)}</span>
        </div>
      )}
      {hasDeliveryCharge && (
        <div className="inv-total-row">
          <span className="inv-label">Delivery</span>
          <span className="inv-mono">+ {formatKWD(order.delivery_charge)}</span>
        </div>
      )}
      <div className="inv-total-row inv-total-main">
        <span>Total</span>
        <span className="inv-mono">{formatKWD(order.final_price)}</span>
      </div>
      {paymentStatus === 'partial' && amountPaid !== null && amountPaid !== 0 && (
        <div className="inv-total-row">
          <span className="inv-label">Amount Paid</span>
          <span className="inv-mono">{formatKWD(String(amountPaid))}</span>
        </div>
      )}
      {paymentStatus === 'paid' ? (
        <div className="inv-total-row">
          <span className="inv-label">Balance</span>
          <span className="inv-paid">✓ Fully Paid</span>
        </div>
      ) : balance > 0 ? (
        <div className="inv-total-row">
          <span className="inv-label">Balance Due</span>
          <span className="inv-mono">{formatKWD(String(balance))}</span>
        </div>
      ) : null}
      {inquiry.payment_method && (
        <div className="inv-row">
          <span className="inv-label">Payment Method:</span>
          <span>{inquiry.payment_method === 'wamd' ? 'WAMD' : 'Cash'}</span>
        </div>
      )}

      {deposit !== null && deposit !== 0 && (
        <>
          <div className="inv-divider" />
          <div className="inv-total-row">
            <span className="inv-label">Security Deposit</span>
            <span className="inv-mono">{formatKWD(String(deposit))}</span>
          </div>
          <div className="inv-deposit-hint">Held as collateral — not counted toward balance.</div>
        </>
      )}

      <div className="inv-divider" />

      <div className="inv-row">
        <span className="inv-label">Delivery:</span>
        <span>{order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
      </div>
      {deliveryAddr && (
        <div className="inv-row">
          <span className="inv-label">Address:</span>
          <span>{deliveryAddr}</span>
        </div>
      )}

      <p className="inv-note">
        Once the order is booked and confirmed, no further<br />
        cancellations or changes will be accepted.
      </p>
    </div>
  )
}
