import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { formatTime, formatKWD } from '@/lib/utils'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import type { PaymentMethod, InquiryItem } from '@/lib/supabase/types'

export interface A4PaymentReceiptProps {
  payment: {
    amount: string
    method: PaymentMethod
    receipt_token: string
    note: string | null
    paid_at: string
  }
  order: {
    final_price: string
    /** Cumulative paid through THIS payment (frozen by the page), not the live total. */
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

const INK = 'var(--color-ink)'
const SECONDARY = 'var(--color-ink-secondary)'
const MUTED = 'var(--color-ink-muted)'
const LINE = '#e4ded6'
const SERIF = 'var(--font-display)'
const MONO = 'var(--font-mono)'

const longDate = (iso: string) => format(parseISO(iso), 'd MMMM yyyy')
const shortDate = (iso: string) => format(parseISO(iso), 'dd MMM yyyy')

/**
 * Formal payment receipt laid out for an A4 sheet (210 × 297 mm) — the "statement"
 * direction: amount, date and method first, a meta strip, billed-to, items, totals,
 * and a footer pinned to the bottom. Serif (Fraunces) carries the brand moments;
 * everything else is the body sans. Used for both the printout and the saved image.
 */
export function A4PaymentReceipt({ payment, order, inquiry, businessPhone, businessInstagram }: A4PaymentReceiptProps) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const isPaid = derivePaymentStatus(order.amount_paid, order.final_price, inquiry.fully_paid) === 'paid'
  const paidBefore = Math.max(0, Number(order.amount_paid ?? 0) - Number(payment.amount))
  const invoiceNo = inquiry.invoice_number
    ? `ZM-${new Date().getFullYear()}-${String(inquiry.invoice_number).padStart(4, '0')}`
    : null
  const method = payment.method === 'wamd' ? 'WAMD' : 'Cash'
  const contact = [businessInstagram, businessPhone].filter(Boolean).join('  ·  ')

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ fontFamily: 'var(--font-sans)', color: SECONDARY, fontSize: '10pt', lineHeight: 1.45, fontVariantNumeric: 'tabular-nums' }}
    >
      {/* Brand header */}
      <header className="flex items-center justify-between" style={{ gap: '8mm' }}>
        <div className="flex items-center" style={{ gap: '3.5mm' }}>
          {/* PNG, not logo.svg: that SVG wraps an embedded raster and Chrome's print output draws a hairline seam under it */}
          <Image src="/logo.png" alt="" width={52} height={52} style={{ width: 52, height: 52 }} priority />
          <div>
            <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '17pt', lineHeight: 1.1, color: 'var(--color-teal)', letterSpacing: '-0.01em' }}>
              {BRAND_NAME}
            </p>
            <p style={{ fontSize: '8.5pt', color: MUTED }}>Custom cakes · Kuwait</p>
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '17pt', lineHeight: 1.1, color: INK }}>Receipt</p>
          <p style={{ fontFamily: MONO, fontSize: '8.5pt', color: MUTED }}>No. {payment.receipt_token}</p>
        </div>
      </header>

      {/* Amount — the first thing read */}
      <section className="flex items-end justify-between" style={{ marginTop: '15mm', gap: '8mm' }}>
        <div>
          <Label>Amount paid</Label>
          <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: '32pt', lineHeight: 1, color: INK, letterSpacing: '-0.02em' }}>
            {formatKWD(payment.amount)}
          </p>
          <p style={{ color: MUTED, marginTop: '2.5mm' }}>
            Paid {longDate(payment.paid_at)} by {method}
          </p>
        </div>
        <StatusPill paid={isPaid} balance={balance} />
      </section>

      {/* Meta strip */}
      <section
        className="grid"
        style={{
          gridTemplateColumns: invoiceNo ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          marginTop: '10mm',
          borderTop: `1px solid ${LINE}`,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <MetaCell first label="Receipt no." value={payment.receipt_token} mono />
        {invoiceNo && <MetaCell label="Invoice" value={invoiceNo} mono />}
        <MetaCell label="Date paid" value={shortDate(payment.paid_at)} />
        <MetaCell label="Method" value={method} />
      </section>

      {/* Billed to / order */}
      <section className="flex items-start justify-between" style={{ marginTop: '9mm', gap: '10mm' }}>
        <div>
          <Label>Billed to</Label>
          <p style={{ fontFamily: SERIF, fontSize: '13pt', color: INK, lineHeight: 1.25 }}>{inquiry.customer_name}</p>
          <p style={{ color: MUTED }}>{inquiry.customer_phone}</p>
        </div>
        <div className="text-right">
          <Label>Order</Label>
          <p style={{ color: INK }}>Event {shortDate(inquiry.event_date)}</p>
          {inquiry.pickup_time && <p style={{ color: MUTED }}>{formatTime(inquiry.pickup_time)}</p>}
        </div>
      </section>

      {/* Items */}
      <table className="w-full" style={{ borderCollapse: 'collapse', marginTop: '9mm' }}>
        <thead>
          <tr>
            <Th>Description</Th>
            <Th align="right">Qty</Th>
          </tr>
        </thead>
        <tbody>
          {inquiry.items.map((item, idx) => {
            const isOther = item.order_type === 'other_item'
            const name = isOther ? item.item_name : 'Custom cake'
            const details = (isOther ? [item.cake_size] : [item.cake_size, item.flavor, item.theme && `${item.theme} theme`])
              .filter(Boolean)
              .join(' · ')
            return (
              <tr key={item.id ?? idx}>
                <Td>
                  <p style={{ color: INK, fontWeight: 600 }}>{name}</p>
                  {details && <p style={{ color: MUTED, fontSize: '9pt' }}>{details}</p>}
                </Td>
                <Td align="right" style={{ color: INK }}>{item.quantity || 1}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Note + totals */}
      <section className="flex items-start justify-between" style={{ marginTop: '7mm', gap: '12mm' }}>
        <div className="min-w-0 flex-1">
          {payment.note && (
            <>
              <Label>Note</Label>
              <p>{payment.note}</p>
            </>
          )}
        </div>
        <dl style={{ width: '76mm', display: 'grid', gap: '1.6mm' }}>
          <SumRow label="Order total" value={formatKWD(order.final_price)} />
          <SumRow label="Paid previously" value={formatKWD(String(paidBefore))} />
          <SumRow label="This payment" value={formatKWD(payment.amount)} />
          <div style={{ borderTop: `1px solid ${LINE}`, margin: '1mm 0' }} />
          {isPaid ? (
            <SumRow label="Balance" value={formatKWD('0')} strong color="var(--color-success)" />
          ) : (
            <SumRow label="Balance due" value={formatKWD(String(balance))} strong color="var(--color-warning)" />
          )}
        </dl>
      </section>

      {/* Footer — pinned to the bottom of the sheet */}
      <footer className="mt-auto">
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '12pt', color: INK, textAlign: 'center', marginBottom: '5mm' }}>
          Thank you for celebrating with us
        </p>
        <div className="flex items-baseline justify-between" style={{ borderTop: `1px solid ${LINE}`, paddingTop: '4mm', fontSize: '8.5pt', gap: '6mm' }}>
          <span style={{ fontFamily: SERIF, fontWeight: 600, color: INK }}>{BRAND_NAME}</span>
          {contact && <span style={{ color: MUTED }}>{contact}</span>}
          <span style={{ color: MUTED }}>Computer-generated · no signature needed</span>
        </div>
      </footer>
    </div>
  )
}

export default A4PaymentReceipt

function Label({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: '7.5pt', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: '1.8mm' }}>
      {children}
    </p>
  )
}

function StatusPill({ paid, balance }: { paid: boolean; balance: number }) {
  const color = paid ? 'var(--color-success)' : 'var(--color-warning)'
  const bg = paid ? 'var(--color-success-light)' : 'var(--color-warning-light)'
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: '1.6mm', color, backgroundColor: bg, borderRadius: 999, padding: '1.3mm 3.5mm', fontSize: '8.5pt', fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      <span style={{ width: '1.8mm', height: '1.8mm', borderRadius: '50%', backgroundColor: 'currentColor' }} />
      {paid ? 'Paid in full' : `Part payment · ${formatKWD(String(balance))} due`}
    </span>
  )
}

function MetaCell({ label, value, mono, first }: { label: string; value: string; mono?: boolean; first?: boolean }) {
  return (
    <div style={{ padding: '3mm 0 3mm', paddingLeft: first ? 0 : '4mm', borderLeft: first ? undefined : `1px solid ${LINE}`, minWidth: 0 }}>
      <Label>{label}</Label>
      <p style={{ color: INK, fontFamily: mono ? MONO : undefined, overflowWrap: 'anywhere' }}>{value}</p>
    </div>
  )
}

function SumRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex justify-between" style={{ gap: '4mm', fontWeight: strong ? 600 : 400 }}>
      <dt style={{ color: strong ? INK : MUTED }}>{label}</dt>
      <dd style={{ color: color ?? INK }}>{value}</dd>
    </div>
  )
}

function Th({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <th
      style={{
        textAlign: align ?? 'left',
        fontSize: '7.5pt',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: MUTED,
        padding: '2mm 0',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align, style }: { children: ReactNode; align?: 'right'; style?: CSSProperties }) {
  return (
    <td style={{ textAlign: align ?? 'left', verticalAlign: 'top', padding: '2.8mm 0', borderBottom: `1px solid ${LINE}`, ...style }}>
      {children}
    </td>
  )
}
