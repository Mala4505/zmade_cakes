import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { formatDate, formatTime, formatKWD } from '@/lib/utils'
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

const MUTED = 'var(--color-ink-muted)'
const SECONDARY = 'var(--color-ink-secondary)'
const INK = 'var(--color-ink)'
const HAIRLINE = 'var(--color-border)'
const MONO = 'var(--font-mono)'

/**
 * Formal payment receipt laid out for an A4 sheet (210 × 297 mm). Used for both the
 * printout and the saved image, so it is sized in mm and pins its footer to the bottom
 * of the page. The on-screen receipt is the thermal bill (ThermalReceiptContent).
 */
export function A4PaymentReceipt({ payment, order, inquiry, businessPhone, businessInstagram }: A4PaymentReceiptProps) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const isPaid = derivePaymentStatus(order.amount_paid, order.final_price, inquiry.fully_paid) === 'paid'
  const paidToDate = Number(order.amount_paid ?? 0)
  const paidBefore = Math.max(0, paidToDate - Number(payment.amount))
  const invoiceNo = inquiry.invoice_number
    ? `ZM-${new Date().getFullYear()}-${String(inquiry.invoice_number).padStart(4, '0')}`
    : null
  const method = payment.method === 'wamd' ? 'WAMD' : 'Cash'

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ fontFamily: 'var(--font-sans)', color: SECONDARY, fontSize: '10.5pt', lineHeight: 1.5 }}
    >
      {/* Letterhead */}
      <div style={{ height: '1.6mm', backgroundColor: 'var(--color-teal)' }} />
      <header className="flex items-start justify-between" style={{ padding: '9mm 0 7mm', gap: '10mm' }}>
        <div className="flex items-center" style={{ gap: '4mm' }}>
          <Image src="/logo.svg" alt="" width={64} height={64} style={{ width: '17mm', height: '17mm' }} priority />
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22pt', lineHeight: 1.1, color: 'var(--color-teal)' }}>
              {BRAND_NAME}
            </p>
            <p style={{ color: MUTED, fontSize: '10pt', marginTop: '1mm' }}>Made with love · Kuwait</p>
            {(businessInstagram || businessPhone) && (
              <p style={{ color: MUTED, fontSize: '9.5pt' }}>
                {[businessInstagram, businessPhone].filter(Boolean).join('  ·  ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontWeight: 700, fontSize: '19pt', letterSpacing: '0.08em', color: INK, lineHeight: 1.1 }}>
            PAYMENT RECEIPT
          </p>
          <p style={{ fontFamily: MONO, fontSize: '10pt', color: SECONDARY, marginTop: '2mm' }}>No. {payment.receipt_token}</p>
          <p style={{ fontSize: '9.5pt', color: MUTED }}>Issued {formatDate(payment.paid_at)}</p>
        </div>
      </header>

      <Rule />

      {/* Parties */}
      <section className="grid grid-cols-2" style={{ gap: '12mm', padding: '6mm 0' }}>
        <div>
          <Label>Received from</Label>
          <p style={{ fontSize: '13pt', fontWeight: 600, color: INK }}>{inquiry.customer_name}</p>
          <p style={{ fontFamily: MONO, fontSize: '10pt' }}>{inquiry.customer_phone}</p>
        </div>
        <div>
          <Label>Receipt details</Label>
          <dl className="grid" style={{ gridTemplateColumns: 'auto 1fr', columnGap: '6mm', rowGap: '1mm' }}>
            {invoiceNo && <Detail label="Invoice" value={invoiceNo} mono />}
            <Detail label="Date paid" value={formatDate(payment.paid_at)} mono />
            <Detail label="Method" value={method} />
            <Detail
              label="Event date"
              value={`${formatDate(inquiry.event_date)}${inquiry.pickup_time ? ` · ${formatTime(inquiry.pickup_time)}` : ''}`}
              mono
            />
          </dl>
        </div>
      </section>

      {/* Amount band */}
      <section
        className="flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface-raised)', borderRadius: '2mm', padding: '6mm 7mm' }}
      >
        <div>
          <Label>Amount received</Label>
          <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: '26pt', lineHeight: 1.1, color: INK }}>
            {formatKWD(payment.amount)}
          </p>
        </div>
        <StatusMark paid={isPaid} balance={balance} />
      </section>

      {/* Items */}
      <section style={{ paddingTop: '8mm' }}>
        <Label>Order items</Label>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10.5pt' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${HAIRLINE}`, color: MUTED, fontSize: '8.5pt', letterSpacing: '0.08em' }}>
              <Th className="w-[9mm]">#</Th>
              <Th>ITEM</Th>
              <Th>DETAILS</Th>
              <Th className="w-[16mm] text-right">QTY</Th>
            </tr>
          </thead>
          <tbody>
            {inquiry.items.map((item, idx) => {
              const isOther = item.order_type === 'other_item'
              const name = isOther ? item.item_name : 'Custom cake'
              const details = (isOther
                ? [item.cake_size]
                : [item.cake_size, item.flavor, item.theme && `${item.theme} theme`]
              ).filter(Boolean).join(' · ')
              return (
                <tr key={item.id ?? idx} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <Td style={{ fontFamily: MONO, color: MUTED }}>{idx + 1}</Td>
                  <Td style={{ color: INK, fontWeight: 600 }}>{name}</Td>
                  <Td>{details || '—'}</Td>
                  <Td className="text-right" style={{ fontFamily: MONO }}>{item.quantity || 1}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Summary */}
      <section className="flex justify-between" style={{ paddingTop: '8mm', gap: '12mm' }}>
        <div className="flex-1">
          {payment.note && (
            <>
              <Label>Note</Label>
              <p style={{ fontSize: '10.5pt' }}>{payment.note}</p>
            </>
          )}
        </div>
        <dl style={{ width: '78mm' }}>
          <SumRow label="Order total" value={formatKWD(order.final_price)} />
          <SumRow label="Paid before this payment" value={formatKWD(String(paidBefore))} />
          <SumRow label="This payment" value={formatKWD(payment.amount)} />
          <div style={{ borderTop: `1px solid ${HAIRLINE}`, margin: '2mm 0' }} />
          <SumRow label="Total paid to date" value={formatKWD(order.amount_paid)} strong />
          {isPaid ? (
            <SumRow label="Balance" value="Fully paid" color="var(--color-success)" strong />
          ) : (
            <SumRow label="Balance due" value={formatKWD(String(balance))} strong />
          )}
        </dl>
      </section>

      {/* Footer — pinned to the bottom of the sheet */}
      <footer className="mt-auto text-center" style={{ paddingTop: '8mm' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '13pt', color: INK }}>Thank you for your order</p>
        <p style={{ fontSize: '9pt', color: MUTED, marginTop: '1mm' }}>
          This receipt confirms payment received{invoiceNo ? ` against invoice ${invoiceNo}` : ''}. It is computer-generated
          and valid without a signature.
        </p>
        <div style={{ borderTop: `1px dashed ${HAIRLINE}`, margin: '4mm 0 3mm' }} />
        <p style={{ fontSize: '9pt', color: MUTED }}>
          {[BRAND_NAME, businessInstagram, businessPhone].filter(Boolean).join('  ·  ')}
        </p>
      </footer>
    </div>
  )
}

export default A4PaymentReceipt

function Rule() {
  return <div style={{ borderTop: `1px solid ${HAIRLINE}` }} />
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: '8.5pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: '2mm' }}>
      {children}
    </p>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt style={{ color: MUTED }}>{label}</dt>
      <dd className="text-right" style={{ color: INK, fontFamily: mono ? MONO : undefined }}>{value}</dd>
    </>
  )
}

function StatusMark({ paid, balance }: { paid: boolean; balance: number }) {
  const color = paid ? 'var(--color-success)' : 'var(--color-warning)'
  return (
    <div
      className="text-center"
      style={{ border: `2px solid ${color}`, color, borderRadius: '1.5mm', padding: '2.5mm 5mm', transform: 'rotate(-4deg)' }}
    >
      <p style={{ fontWeight: 800, fontSize: '14pt', letterSpacing: '0.16em', lineHeight: 1.1 }}>
        {paid ? 'PAID IN FULL' : 'PART PAYMENT'}
      </p>
      {!paid && (
        <p style={{ fontFamily: MONO, fontSize: '9pt', marginTop: '1mm' }}>Balance {formatKWD(String(balance))}</p>
      )}
    </div>
  )
}

function SumRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex justify-between" style={{ padding: '0.8mm 0', gap: '4mm' }}>
      <dt style={{ color: strong ? INK : MUTED, fontWeight: strong ? 600 : 400 }}>{label}</dt>
      <dd style={{ fontFamily: MONO, color: color ?? INK, fontWeight: strong ? 700 : 400 }}>{value}</dd>
    </div>
  )
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={['text-left font-semibold', className].filter(Boolean).join(' ')} style={{ padding: '2mm 2mm 2mm 0' }}>
      {children}
    </th>
  )
}

function Td({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <td className={['align-top', className].filter(Boolean).join(' ')} style={{ padding: '3mm 2mm 3mm 0', ...style }}>
      {children}
    </td>
  )
}
