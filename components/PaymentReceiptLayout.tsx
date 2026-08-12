import Image from 'next/image'
import { formatDate, formatKWD } from '@/lib/utils'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import type { PaymentMethod } from '@/lib/supabase/types'

interface Props {
  payment: {
    amount: string
    method: PaymentMethod
    receipt_token: string
    note: string | null
    paid_at: string
  }
  order: {
    final_price: string
    amount_paid: string | null
  }
  inquiry: {
    customer_name: string
    customer_phone: string
    order_type?: 'cake' | 'other_item'
    item_name: string
    cake_size: string
    flavor: string
    theme?: string
    occasion?: string
    event_date: string
    pickup_time: string | null
    fully_paid: boolean
  }
  businessPhone?: string
  businessInstagram?: string
}

export default function PaymentReceiptLayout({ payment, order, inquiry, businessPhone, businessInstagram }: Props) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, order.amount_paid)

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-[var(--shadow-floating)] print:shadow-none print:rounded-none print:!border-none"
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
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt=""
            width={44}
            height={44}
            style={{ width: 44, height: 44, flexShrink: 0 }}
            priority
          />
          <div>
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--color-teal)', fontFamily: 'var(--font-display)' }}
            >
              {BRAND_NAME}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
              Handcrafted with love
            </p>
          </div>
        </div>
        <div>
          <p
            className="text-4xl font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-border)', letterSpacing: '0.2em' }}
          >
            RECEIPT
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
          >
            {`No. ${payment.receipt_token}`}
          </p>
        </div>
      </div>

      {/* Contact line */}
      {(businessInstagram || businessPhone) && (
        <div className="px-6 pb-3">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {[businessInstagram, businessPhone].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />

      {/* Order reference section */}
      <div className="px-6 pt-4 pb-2">
        <p
          className="text-sm font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Order Reference
        </p>

        <InvRow label="Customer" value={inquiry.customer_name} />
        <InvRow label="Phone" value={inquiry.customer_phone} mono />

        {inquiry.order_type === 'other_item' ? (
          <>
            <InvRow label="Item" value={inquiry.item_name} />
            {inquiry.cake_size && <InvRow label="Size" value={inquiry.cake_size} />}
          </>
        ) : (
          <>
            <InvRow label="Size" value={inquiry.cake_size} />
            <InvRow label="Flavor" value={inquiry.flavor} />
          </>
        )}

        <InvRow label="Event Date" value={formatDate(inquiry.event_date)} mono />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 24px' }} />

      {/* Payment section */}
      <div className="px-6 pt-4 pb-2">
        <p
          className="text-sm font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Payment
        </p>

        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
            Amount Received
          </span>
          <span
            className="text-xl font-bold"
            style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
          >
            {formatKWD(payment.amount)}
          </span>
        </div>

        <InvRow label="Date Paid" value={formatDate(payment.paid_at)} mono />
        <InvRow label="Method" value={payment.method === 'wamd' ? 'WAMD' : 'Cash'} />
        {payment.note && <InvRow label="Note" value={payment.note} />}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px dashed var(--color-border)', margin: '0 24px' }} />

      {/* Order context section */}
      <div className="px-6 pt-4 pb-5">
        <p
          className="text-sm font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Order Balance
        </p>

        <InvRow label="Order Total" value={formatKWD(order.final_price)} mono />
        <InvRow label="Total Paid to Date" value={formatKWD(order.amount_paid)} mono />

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
        ) : balance > 0 ? (
          <InvRow label="Balance Due" value={formatKWD(String(balance))} mono />
        ) : null}
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
      <span className="text-sm pt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <span
        className="text-base text-right"
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
