import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatDate, formatTime, formatKWD, GOVERNORATE_LABELS } from '@/lib/utils'
import { hasAllergens, ALLERGEN_LABELS } from '@/lib/supabase/types'
import { derivePaymentStatus, balanceOwed } from '@/lib/payments'
import { BRAND_NAME } from '@/lib/brand'
import { registerPdfFonts } from '@/lib/pdfFonts'
import type { DeliveryType, InquiryItem } from '@/lib/supabase/types'

registerPdfFonts()

interface Props {
  order: {
    id: string
    final_price: string
    deposit_amount: string | null
    amount_paid: string | null
    delivery_charge: string | null
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
    items: InquiryItem[]
    event_date: string
    pickup_time: string | null
    admin_price: string | null
    discount: string | null
    fully_paid: boolean
    payment_method: string
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

const TEAL = '#006860'
const INK = '#1a1a1a'
const INK_MUTED = '#6b7280'
const INK_SECONDARY = '#374151'
const BORDER = '#d9d3c7'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Open Sauce Sans',
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
    width: 56,
    height: 56,
    marginRight: 14,
  },
  brandName: {
    fontFamily: 'Fraunces',
    fontWeight: 700,
    fontSize: 24,
    color: TEAL,
  },
  tagline: {
    fontSize: 11,
    color: INK_MUTED,
    marginTop: 2,
  },
  invoiceLabel: {
    fontFamily: 'Open Sauce Sans',
    fontWeight: 700,
    fontSize: 22,
    color: BORDER,
    letterSpacing: 2,
    textAlign: 'right',
  },
  invoiceNumber: {
    fontFamily: 'Geist Mono',
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
    fontFamily: 'Open Sauce Sans',
    fontWeight: 700,
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
    fontFamily: 'Geist Mono',
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
    fontFamily: 'Open Sauce Sans',
    fontWeight: 700,
    fontSize: 15,
    color: INK,
  },
  totalValue: {
    fontFamily: 'Geist Mono',
    fontSize: 15,
    color: INK,
  },
  balancePaidLabel: {
    fontSize: 12,
    color: INK_MUTED,
  },
  balancePaidValue: {
    fontFamily: 'Open Sauce Sans',
    fontWeight: 700,
    fontSize: 14,
    color: '#16a34a',
  },
  depositHint: {
    fontSize: 9,
    color: INK_MUTED,
    marginTop: -1,
    marginBottom: 4,
  },
  allergenTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergenTag: {
    fontSize: 10,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'dashed',
    marginTop: 14,
    paddingTop: 12,
    fontSize: 9,
    color: INK_MUTED,
    textAlign: 'center',
    lineHeight: 1.5,
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

export default function InvoicePdfDocument({ order, inquiry, businessPhone, businessInstagram, invoiceNumber }: Props) {
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
  const paymentStatus = derivePaymentStatus(order.amount_paid, order.final_price, inquiry.fully_paid)
  const hasDiscount = Number(inquiry.discount) > 0
  const hasDeliveryCharge = order.delivery_type === 'delivery' && Number(order.delivery_charge) > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Image src="/logo.png" style={styles.logo} />
            <View>
              <Text style={styles.brandName}>{BRAND_NAME}</Text>
              <Text style={styles.tagline}>Made with love</Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>{paymentStatus === 'paid' ? 'RECEIPT' : 'INVOICE'}</Text>
            {(invoiceNumber ?? order.invoice_number) && (
              <Text style={styles.invoiceNumber}>
                {`ZM-${new Date().getFullYear()}-${String(invoiceNumber ?? order.invoice_number).padStart(4, '0')}`}
              </Text>
            )}
          </View>
        </View>

        {/* Contact line */}
        {(businessInstagram || businessPhone) && (
          <Text style={styles.contactLine}>
            {[businessInstagram, businessPhone].filter(Boolean).join(' · ')}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Order Details */}
        <View>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <Row label="Customer" value={inquiry.customer_name} />
          <Row label="Phone" value={inquiry.customer_phone} mono />
          <View style={styles.divider} />
          <Row label="Event Date" value={formatDate(inquiry.event_date)} mono />
          {inquiry.pickup_time && <Row label="Time" value={formatTime(inquiry.pickup_time)} mono />}
          <Row label="Delivery" value={order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'} />
          {deliveryAddr && <Row label="Address" value={deliveryAddr} />}
        </View>

        <View style={styles.divider} />

        {/* Cake Details — one block per item, so a multi-item order shows N blocks */}
        {inquiry.items.map((item, idx) => (
          <View key={item.id ?? idx}>
            {idx > 0 && <View style={styles.divider} />}
            <Text style={styles.sectionTitle}>
              {inquiry.items.length > 1 ? `Cake Details ${idx + 1}` : 'Cake Details'}
            </Text>
            {item.order_type === 'other_item' ? (
              <>
                <Row label="Item" value={item.item_name} />
                {item.cake_size && <Row label="Size" value={item.cake_size} />}
              </>
            ) : (
              <>
                <Row label="Size" value={item.cake_size} />
                <Row label="Flavor" value={item.flavor} />
                {item.theme && <Row label="Theme" value={item.theme} />}
                {item.occasion && <Row label="Occasion" value={item.occasion} />}
                {item.message_on_cake && <Row label="Message" value={`"${item.message_on_cake}"`} />}
              </>
            )}
            <Row label="Quantity" value={String(item.quantity)} mono />
            {item.special_requirements && <Row label="Notes" value={item.special_requirements} />}
          </View>
        ))}

        {/* Allergens */}
        {hasAllergens(inquiry) && allergenList.length > 0 && (
          <>
            <View style={styles.divider} />
            <View>
              <Text style={styles.sectionTitle}>Dietary Requirements</Text>
              <View style={styles.allergenTagsWrap}>
                {allergenList.map((label) => (
                  <Text key={label} style={styles.allergenTag}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.dividerSolid} />

        {/* Payment */}
        <View>
          <Text style={styles.sectionTitle}>Payment</Text>

          <Row label="Subtotal" value={formatKWD(inquiry.admin_price)} mono />
          {hasDiscount && (
            <Row label="Discount" value={`- ${formatKWD(inquiry.discount)}`} mono />
          )}
          {hasDeliveryCharge && (
            <Row label="Delivery" value={`+ ${formatKWD(order.delivery_charge)}`} mono />
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatKWD(order.final_price)}</Text>
          </View>

          {paymentStatus === 'partial' && amountPaid !== null && amountPaid !== 0 && (
            <Row label="Amount Paid" value={formatKWD(String(amountPaid))} mono />
          )}

          {paymentStatus === 'paid' ? (
            <View style={styles.totalRow}>
              <Text style={styles.balancePaidLabel}>Balance</Text>
              <Text style={styles.balancePaidValue}>Fully Paid</Text>
            </View>
          ) : balance > 0 ? (
            <Row label="Balance Due" value={formatKWD(String(balance))} mono />
          ) : null}

          {inquiry.payment_method && (
            <Row label="Payment Method" value={inquiry.payment_method === 'wamd' ? 'WAMD' : 'Cash'} />
          )}
        </View>

        {/* Security Deposit — informational only, held as collateral, not counted toward balance */}
        {deposit !== null && deposit !== 0 && (
          <>
            <View style={styles.divider} />
            <View>
              <Row label="Security Deposit" value={formatKWD(String(deposit))} mono />
              <Text style={styles.depositHint}>Held as collateral — not counted toward balance.</Text>
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Once the order is booked and confirmed, no further{'\n'}cancellations or changes will be accepted.
        </Text>
      </Page>
    </Document>
  )
}
