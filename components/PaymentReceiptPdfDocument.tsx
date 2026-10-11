import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { formatTime, formatKWD } from '@/lib/utils'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import { registerPdfFonts } from '@/lib/pdfFonts'
import type { PaymentMethod, InquiryItem } from '@/lib/supabase/types'

registerPdfFonts()

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
    items: InquiryItem[]
    event_date: string
    pickup_time: string | null
    fully_paid: boolean
    invoice_number?: number | null
  }
  businessPhone?: string
  businessInstagram?: string
}

// Same layout as components/receipt/A4PaymentReceipt.tsx (the on-screen print/share
// version). Keep the two in step. 1mm = 2.835pt.
const TEAL = '#006860'
const INK = '#191614'
const SECONDARY = '#3d3936'
const MUTED = '#6b6461'
const LINE = '#e4ded6'
const SUCCESS = '#2e7d52'
const SUCCESS_LIGHT = '#e8f5ee'
const WARNING = '#92600f'
const WARNING_LIGHT = '#fdf3e3'
const PAPER = '#fefdfb'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Open Sauce Sans',
    fontSize: 10,
    color: SECONDARY,
    backgroundColor: PAPER,
    paddingVertical: 45,
    paddingHorizontal: 48,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBlock: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, marginRight: 10 },
  brandName: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 17, color: TEAL },
  brandSub: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  titleBlock: { alignItems: 'flex-end' },
  title: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 17, color: INK },
  titleNo: { fontFamily: 'Geist Mono', fontSize: 8.5, color: MUTED, marginTop: 1 },

  label: { fontSize: 7.5, fontWeight: 600, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 42 },
  amount: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 32, color: INK, lineHeight: 1 },
  paidLine: { color: MUTED, marginTop: 7 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillDot: { width: 5, height: 5, borderRadius: 999, marginRight: 4.5 },
  pillText: { fontSize: 8.5, fontWeight: 600 },

  meta: { flexDirection: 'row', marginTop: 28, borderTopWidth: 1, borderTopColor: LINE, borderBottomWidth: 1, borderBottomColor: LINE },
  metaCell: { flex: 1, paddingVertical: 8, paddingLeft: 11, borderLeftWidth: 1, borderLeftColor: LINE },
  metaCellFirst: { flex: 1, paddingVertical: 8, paddingLeft: 0 },
  metaValue: { color: INK },
  metaMono: { fontFamily: 'Geist Mono', color: INK },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 26 },
  billName: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, color: INK },
  muted: { color: MUTED },
  ink: { color: INK },
  right: { alignItems: 'flex-end' },

  tableHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  thText: { fontSize: 7.5, fontWeight: 600, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  itemName: { fontWeight: 600, color: INK },
  itemDetail: { fontSize: 9, color: MUTED, marginTop: 1 },
  itemQty: { color: INK, marginLeft: 12 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 },
  noteBlock: { flex: 1, marginRight: 34 },
  sums: { width: 215 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4.5 },
  sumRule: { borderTopWidth: 1, borderTopColor: LINE, marginTop: 3, marginBottom: 6 },
  sumStrong: { fontWeight: 600 },

  spacer: { flexGrow: 1 },
  thanks: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 12, color: INK, textAlign: 'center', marginBottom: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: LINE, paddingTop: 11 },
  footerBrand: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 8.5, color: INK },
  footerText: { fontSize: 8.5, color: MUTED },
})

const longDate = (iso: string) => format(parseISO(iso), 'd MMMM yyyy')
const shortDate = (iso: string) => format(parseISO(iso), 'dd MMM yyyy')

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>
}

function SumRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[strong ? styles.sumStrong : {}, { color: strong ? INK : MUTED }]}>{label}</Text>
      <Text style={[strong ? styles.sumStrong : {}, { color: color ?? INK }]}>{value}</Text>
    </View>
  )
}

export default function PaymentReceiptPdfDocument({ payment, order, inquiry, businessPhone, businessInstagram }: Props) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const isPaid = derivePaymentStatus(order.amount_paid, order.final_price, inquiry.fully_paid) === 'paid'
  const paidBefore = Math.max(0, Number(order.amount_paid ?? 0) - Number(payment.amount))
  const invoiceNo = inquiry.invoice_number
    ? `ZM-${new Date().getFullYear()}-${String(inquiry.invoice_number).padStart(4, '0')}`
    : null
  const method = payment.method === 'wamd' ? 'WAMD' : 'Cash'
  const contact = [businessInstagram, businessPhone].filter(Boolean).join('  ·  ')
  const pillColor = isPaid ? SUCCESS : WARNING
  const pillBg = isPaid ? SUCCESS_LIGHT : WARNING_LIGHT

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Brand header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>{BRAND_NAME}</Text>
              <Text style={styles.brandSub}>Custom cakes · Kuwait</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Receipt</Text>
            <Text style={styles.titleNo}>No. {payment.receipt_token}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <View>
            <Label>Amount paid</Label>
            <Text style={styles.amount}>{formatKWD(payment.amount)}</Text>
            <Text style={styles.paidLine}>Paid {longDate(payment.paid_at)} by {method}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <View style={[styles.pillDot, { backgroundColor: pillColor }]} />
            <Text style={[styles.pillText, { color: pillColor }]}>
              {isPaid ? 'Paid in full' : `Part payment · ${formatKWD(String(balance))} due`}
            </Text>
          </View>
        </View>

        {/* Meta strip */}
        <View style={styles.meta}>
          <View style={styles.metaCellFirst}>
            <Label>Receipt no.</Label>
            <Text style={styles.metaMono}>{payment.receipt_token}</Text>
          </View>
          {invoiceNo && (
            <View style={styles.metaCell}>
              <Label>Invoice</Label>
              <Text style={styles.metaMono}>{invoiceNo}</Text>
            </View>
          )}
          <View style={styles.metaCell}>
            <Label>Date paid</Label>
            <Text style={styles.metaValue}>{shortDate(payment.paid_at)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Label>Method</Label>
            <Text style={styles.metaValue}>{method}</Text>
          </View>
        </View>

        {/* Billed to / order */}
        <View style={styles.billRow}>
          <View>
            <Label>Billed to</Label>
            <Text style={styles.billName}>{inquiry.customer_name}</Text>
            <Text style={styles.muted}>{inquiry.customer_phone}</Text>
          </View>
          <View style={styles.right}>
            <Label>Order</Label>
            <Text style={styles.ink}>Event {shortDate(inquiry.event_date)}</Text>
            {inquiry.pickup_time && <Text style={styles.muted}>{formatTime(inquiry.pickup_time)}</Text>}
          </View>
        </View>

        {/* Items */}
        <View style={styles.tableHead}>
          <Text style={styles.thText}>Description</Text>
          <Text style={styles.thText}>Qty</Text>
        </View>
        {inquiry.items.map((item, idx) => {
          const isOther = item.order_type === 'other_item'
          const name = isOther ? item.item_name : 'Custom cake'
          const details = (isOther ? [item.cake_size] : [item.cake_size, item.flavor, item.theme && `${item.theme} theme`])
            .filter(Boolean)
            .join(' · ')
          return (
            <View key={item.id ?? idx} style={styles.itemRow} wrap={false}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{name}</Text>
                {details ? <Text style={styles.itemDetail}>{details}</Text> : null}
              </View>
              <Text style={styles.itemQty}>{item.quantity || 1}</Text>
            </View>
          )
        })}

        {/* Note + totals */}
        <View style={styles.bottomRow} wrap={false}>
          <View style={styles.noteBlock}>
            {payment.note ? (
              <>
                <Label>Note</Label>
                <Text>{payment.note}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.sums}>
            <SumRow label="Order total" value={formatKWD(order.final_price)} />
            <SumRow label="Paid previously" value={formatKWD(String(paidBefore))} />
            <SumRow label="This payment" value={formatKWD(payment.amount)} />
            <View style={styles.sumRule} />
            {isPaid ? (
              <SumRow label="Balance" value={formatKWD('0')} strong color={SUCCESS} />
            ) : (
              <SumRow label="Balance due" value={formatKWD(String(balance))} strong color={WARNING} />
            )}
          </View>
        </View>

        {/* Footer, pushed to the bottom of the sheet */}
        <View style={styles.spacer} />
        <Text style={styles.thanks}>Thank you for celebrating with us</Text>
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{BRAND_NAME}</Text>
          {contact ? <Text style={styles.footerText}>{contact}</Text> : null}
          <Text style={styles.footerText}>Computer-generated · no signature needed</Text>
        </View>
      </Page>
    </Document>
  )
}
