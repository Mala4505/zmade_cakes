import type { ReactNode } from 'react'
import Image from 'next/image'
import { formatDate, formatKWD } from '@/lib/utils'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import type { PaymentMethod, InquiryItem } from '@/lib/supabase/types'

export interface ThermalReceiptContentProps {
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
    items: InquiryItem[]
    event_date: string
    pickup_time: string | null
    fully_paid: boolean
    invoice_number?: number | null
  }
  businessPhone?: string
  businessInstagram?: string
}

/**
 * Printed content of the thermal-style payment receipt. Renders inside
 * ReceiptPrinter.Paper, which supplies the paper background, torn edge and
 * outer padding — this component only lays out the "ink".
 */
export function ThermalReceiptContent({
  payment,
  order,
  inquiry,
  businessPhone,
  businessInstagram,
}: ThermalReceiptContentProps) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const paymentStatus = derivePaymentStatus(order.amount_paid, order.final_price, inquiry.fully_paid)
  const contactLine = [businessInstagram, businessPhone].filter(Boolean).join(' · ')

  return (
    <div
      className="w-full min-w-0 text-[13px] leading-relaxed sm:text-sm"
      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
    >
      {/* Header */}
      <header className="flex flex-col items-center text-center">
        <Image
          src="/logo.svg"
          alt=""
          width={36}
          height={36}
          style={{ width: 36, height: 36 }}
          priority
        />
        <p
          className="mt-2 text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          {BRAND_NAME}
        </p>
        {contactLine && (
          <p className="mt-1 text-xs break-words" style={{ color: 'var(--color-ink-muted)' }}>
            {contactLine}
          </p>
        )}
        <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.3em] pl-[0.3em]">
          Payment Receipt
        </p>
        <p className="mt-1 text-xs break-all" style={{ color: 'var(--color-ink-secondary)' }}>
          {`No. ${payment.receipt_token}`}
        </p>
      </header>

      <Rule />

      {/* Order reference */}
      <section aria-label="Order reference">
        <SectionLabel>Order</SectionLabel>
        <Row label="Customer" value={inquiry.customer_name} />
        <Row label="Phone" value={inquiry.customer_phone} />
        {inquiry.invoice_number ? (
          <Row
            label="Invoice"
            value={`ZM-${new Date().getFullYear()}-${String(inquiry.invoice_number).padStart(4, '0')}`}
          />
        ) : null}

        {inquiry.items.map((item, idx) => {
          const n = inquiry.items.length > 1 ? ` ${idx + 1}` : ''
          return (
            <div key={item.id ?? idx}>
              {item.order_type === 'other_item' ? (
                <>
                  <Row label={`Item${n}`} value={item.item_name} />
                  {item.cake_size && <Row label={`Size${n}`} value={item.cake_size} />}
                </>
              ) : (
                <>
                  <Row label={`Size${n}`} value={item.cake_size} />
                  <Row label={`Flavor${n}`} value={item.flavor} />
                </>
              )}
            </div>
          )
        })}

        <Row label="Event date" value={formatDate(inquiry.event_date)} />
      </section>

      <Rule />

      {/* Payment */}
      <section aria-label="Payment">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-bold">
          <span className="text-[13px] uppercase tracking-wider">Amount received</span>
          <span className="ml-auto text-xl tabular-nums">{formatKWD(payment.amount)}</span>
        </p>
        <div className="mt-3">
          <Row label="Date paid" value={formatDate(payment.paid_at)} />
          <Row label="Method" value={payment.method === 'wamd' ? 'WAMD' : 'Cash'} />
          {payment.note && <Row label="Note" value={payment.note} />}
        </div>
      </section>

      <Rule />

      {/* Balance */}
      <section aria-label="Order balance">
        <SectionLabel>Balance</SectionLabel>
        <Row label="Order total" value={formatKWD(order.final_price)} />
        <Row label="Paid to date" value={formatKWD(order.amount_paid)} />

        {paymentStatus === 'paid' ? (
          <div className="mt-4 flex justify-center">
            <p
              className="inline-block -rotate-3 rounded-sm px-4 py-1.5 text-base font-bold uppercase tracking-[0.25em]"
              style={{
                color: 'var(--color-success)',
                border: '2px double var(--color-success)',
                paddingLeft: 'calc(1rem + 0.25em)',
              }}
            >
              Fully paid
            </p>
          </div>
        ) : (
          <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-bold">
            <span className="uppercase tracking-wider">Balance due</span>
            <span className="ml-auto text-base tabular-nums">{formatKWD(String(balance))}</span>
          </p>
        )}
      </section>

      <Rule />

      {/* Footer */}
      <footer className="text-center">
        <p className="text-[13px] font-bold">Thank you!</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          Made with love by {BRAND_NAME}
        </p>
        <p
          aria-hidden="true"
          className="mt-3 text-xs tracking-[0.5em] pl-[0.5em]"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          * * *
        </p>
      </footer>
    </div>
  )
}

export default ThermalReceiptContent

function Rule() {
  return (
    <div
      aria-hidden="true"
      className="my-5 border-t-[1.5px] border-dashed"
      style={{ borderColor: 'var(--color-ink-muted)' }}
    />
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]"
      style={{ color: 'var(--color-ink-muted)' }}
    >
      {children}
    </p>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <span
        className="min-w-0 text-right break-words [overflow-wrap:anywhere]"
        style={{ color: 'var(--color-ink)' }}
      >
        {value}
      </span>
    </div>
  )
}
