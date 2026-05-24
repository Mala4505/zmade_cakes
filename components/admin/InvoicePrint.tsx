import { formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'

interface Props {
  order: {
    id: string
    final_price: string
    delivery_type: string
    tracking_token: string
  }
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
    payment_method: string
    special_requirements?: string
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

export default function InvoicePrint({ order, inquiry }: Props) {
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

  return (
    <div id="invoice" className="print-only">
      <style>{`
        @media print {
          #invoice {
            font-family: monospace;
            font-size: 12px;
            color: #000;
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            padding: 0;
          }
          .inv-divider { border-top: 1px dashed #000; margin: 8px 0; }
          .inv-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .inv-label { color: #555; }
          .inv-title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 4px; }
          .inv-sub { text-align: center; font-size: 11px; margin-bottom: 2px; }
          .inv-section-title { font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; font-size: 11px; }
          .inv-note { font-size: 10px; color: #555; margin-top: 12px; text-align: center; line-height: 1.5; }
        }
      `}</style>

      <div className="inv-title">ZMade Cakes — Kuwait</div>
      <div className="inv-sub">@zmadecakes.q8</div>
      <div className="inv-sub">+965 6685 7560</div>

      <div className="inv-divider" />
      <div className="inv-section-title">Order Confirmation</div>
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

      <div className="inv-divider" />

      <div className="inv-row">
        <span className="inv-label">Amount:</span>
        <span>{formatKWD(order.final_price)}</span>
      </div>
      {inquiry.advance_amount && (
        <div className="inv-row">
          <span className="inv-label">Advance Paid:</span>
          <span>{formatKWD(inquiry.advance_amount)} — {inquiry.advance_paid ? 'PAID' : 'UNPAID'}</span>
        </div>
      )}
      {inquiry.payment_method && (
        <div className="inv-row">
          <span className="inv-label">Payment:</span>
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

      <div className="inv-divider" />

      <p className="inv-note">
        Once the order is booked and confirmed, no further<br />
        cancellations or changes will be accepted.
      </p>
    </div>
  )
}
