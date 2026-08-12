import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
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

const TEAL = '#006860'
const INK = '#1a1a1a'
const INK_MUTED = '#6b7280'
const INK_SECONDARY = '#374151'
const BORDER = '#d9d3c7'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK_SECONDARY,
    padding: 28,
  },
  accentBar: {
    height: 4,
    backgroundColor: TEAL,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 24,
    color: TEAL,
  },
  tagline: {
    fontSize: 11,
    color: INK_MUTED,
    marginTop: 2,
  },
  receiptLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: BORDER,
    letterSpacing: 2,
    textAlign: 'right',
  },
  receiptNumber: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: INK_MUTED,
    textAlign: 'right',
    marginTop: 4,
  },
  contactLine: {
    fontSize: 10,
    color: INK_MUTED,
    marginBottom: 10,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'dashed',
    marginVertical: 8,
  },
  dividerSolid: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginVertical: 8,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: INK_MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  rowLabel: {
    fontSize: 12,
    color: INK_MUTED,
  },
  rowValue: {
    fontSize: 13,
    color: INK_SECONDARY,
    textAlign: 'right',
    maxWidth: 320,
  },
  rowValueMono: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: INK_SECONDARY,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 15,
    color: INK,
  },
  totalValue: {
    fontFamily: 'Courier-Bold',
    fontSize: 15,
    color: INK,
  },
  balancePaidLabel: {
    fontSize: 12,
    color: INK_MUTED,
  },
  balancePaidValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#16a34a',
  },
})

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={mono ? styles.rowValueMono : styles.rowValue}>{value}</Text>
    </View>
  )
}

export default function PaymentReceiptPdfDocument({ payment, order, inquiry, businessPhone, businessInstagram }: Props) {
  const balance = balanceOwed(order.final_price, order.amount_paid, inquiry.fully_paid)
  const paymentStatus = derivePaymentStatus(inquiry.fully_paid, order.amount_paid)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Image src="/logo.jpeg" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>{BRAND_NAME}</Text>
              <Text style={styles.tagline}>Handcrafted with love</Text>
            </View>
          </View>
          <View>
            <Text style={styles.receiptLabel}>RECEIPT</Text>
            <Text style={styles.receiptNumber}>{`No. ${payment.receipt_token}`}</Text>
          </View>
        </View>

        {/* Contact line */}
        {(businessInstagram || businessPhone) && (
          <Text style={styles.contactLine}>
            {[businessInstagram, businessPhone].filter(Boolean).join(' · ')}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Order Reference */}
        <View>
          <Text style={styles.sectionTitle}>Order Reference</Text>
          <Row label="Customer" value={inquiry.customer_name} />
          <Row label="Phone" value={inquiry.customer_phone} mono />
          {inquiry.order_type === 'other_item' ? (
            <>
              <Row label="Item" value={inquiry.item_name} />
              {inquiry.cake_size && <Row label="Size" value={inquiry.cake_size} />}
            </>
          ) : (
            <>
              <Row label="Size" value={inquiry.cake_size} />
              <Row label="Flavor" value={inquiry.flavor} />
            </>
          )}
          <Row label="Event Date" value={formatDate(inquiry.event_date)} mono />
        </View>

        <View style={styles.dividerSolid} />

        {/* Payment */}
        <View>
          <Text style={styles.sectionTitle}>Payment</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Received</Text>
            <Text style={styles.totalValue}>{formatKWD(payment.amount)}</Text>
          </View>

          <Row label="Date Paid" value={formatDate(payment.paid_at)} mono />
          <Row label="Method" value={payment.method === 'wamd' ? 'WAMD' : 'Cash'} />
          {payment.note && <Row label="Note" value={payment.note} />}
        </View>

        <View style={styles.divider} />

        {/* Order Balance */}
        <View>
          <Text style={styles.sectionTitle}>Order Balance</Text>

          <Row label="Order Total" value={formatKWD(order.final_price)} mono />
          <Row label="Total Paid to Date" value={formatKWD(order.amount_paid)} mono />

          {paymentStatus === 'paid' ? (
            <View style={styles.totalRow}>
              <Text style={styles.balancePaidLabel}>Balance</Text>
              <Text style={styles.balancePaidValue}>Fully Paid</Text>
            </View>
          ) : balance > 0 ? (
            <Row label="Balance Due" value={formatKWD(String(balance))} mono />
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
