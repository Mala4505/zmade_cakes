import { formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'

interface Props {
  order: {
    id: string
    final_price: string
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
    cake_size: string
    flavor: string
    theme?: string
    decoration_style: string
    occasion?: string
    message_on_cake?: string
    quantity: number
    event_date: string
    pickup_time: string | null
    admin_price: string | null
    advance_amount: string | null
    advance_paid: boolean
    balance_paid: boolean
    payment_method: string
    special_requirements?: string
    allergen_nut_free: boolean
    allergen_gluten_free: boolean
    allergen_dairy_free: boolean
    allergen_egg_free: boolean
    allergen_halal: boolean
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

  const total = parseFloat(order.final_price) || 0
  const advance = inquiry.advance_amount ? parseFloat(inquiry.advance_amount) : null
  const balance = advance !== null ? total - advance : null

  return (
    <div id="invoice" className="print-only">
      <style>{`
        @media print {
          body { font-size: 11pt; margin: 0; }
          @page { margin: 18mm 15mm; }
          .no-print, header, nav, aside { display: none !important; }
          #invoice {
            font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
            color: #111;
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            padding: 0;
          }
          .inv-accent { height: 3px; background: #0d9488; width: 100%; margin-bottom: 18px; }
          .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .inv-brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #0d9488; }
          .inv-tagline { font-size: 11px; color: #777; margin-top: 2px; }
          .inv-label-invoice { font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #ccc; text-transform: uppercase; }
          .inv-divider { border-top: 1px dashed #ccc; margin: 10px 0; }
          .inv-divider-solid { border-top: 1px solid #e5e5e5; margin: 10px 0; }
          .inv-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 10.5pt; }
          .inv-label { color: #777; }
          .inv-section-title { font-weight: 700; margin: 10px 0 5px; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.8px; color: #444; }
          .inv-note { font-size: 9pt; color: #777; margin-top: 16px; text-align: center; line-height: 1.6; border-top: 1px dashed #ccc; padding-top: 10px; }
          .inv-allergen-row { margin: 4px 0; font-size: 10.5pt; }
          .inv-allergen-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
          .inv-allergen-tag { border: 1px solid #f59e0b; color: #92400e; font-size: 9pt; padding: 1px 6px; border-radius: 4px; }
          .inv-total-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 10.5pt; }
          .inv-total-main { font-weight: 700; font-size: 11.5pt; }
          .inv-paid { color: #16a34a; font-weight: 700; font-size: 10.5pt; }
          .inv-mono { font-family: 'Courier New', monospace; }
          .inv-contact { text-align: center; font-size: 9.5pt; color: #555; margin-bottom: 12px; }
          .inv-invoice-number { font-family: 'Courier New', monospace; font-size: 9pt; color: #777; text-align: right; margin-top: 3px; }
        }
      `}</style>

      <div className="inv-accent" />

      <div className="inv-header">
        <div>
          <div className="inv-brand-name">ZMade Cakes</div>
          <div className="inv-tagline">Handcrafted with love</div>
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
      <div className="inv-row">
        <span className="inv-label">Decoration:</span>
        <span>{inquiry.decoration_style}</span>
      </div>
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

      <div className="inv-total-row inv-total-main">
        <span>Total</span>
        <span className="inv-mono">{formatKWD(order.final_price)}</span>
      </div>
      {advance !== null && (
        <div className="inv-total-row">
          <span className="inv-label">Advance Paid</span>
          <span className="inv-mono">{formatKWD(String(advance))}</span>
        </div>
      )}
      {balance !== null && (
        inquiry.balance_paid ? (
          <div className="inv-total-row">
            <span className="inv-label">Balance</span>
            <span className="inv-paid">✓ Fully Paid</span>
          </div>
        ) : (
          <div className="inv-total-row">
            <span className="inv-label">Balance Due</span>
            <span className="inv-mono">{formatKWD(String(balance))}</span>
          </div>
        )
      )}
      {inquiry.payment_method && (
        <div className="inv-row">
          <span className="inv-label">Payment Method:</span>
          <span>{inquiry.payment_method === 'wamd' ? 'WAMD' : 'Cash'}</span>
        </div>
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
