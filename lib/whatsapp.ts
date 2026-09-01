import { balanceOwed, orderTotal } from './payments'
import { normalizePhone } from './utils'
import { DEFAULT_WHATSAPP_TEMPLATES, type WhatsAppTemplates } from './supabase/types'

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`
}

export function whatsappUrlNoText(phone: string): string {
  return `https://wa.me/${normalizePhone(phone)}`
}

export interface WhatsAppActionInput {
  customer_name: string
  customer_phone: string
  fully_paid: boolean
  amount_paid: string | number | null
  customer_confirmed?: boolean       // omitted at order-stage call sites (OrderWhatsAppActions)
  status?: string                    // omitted at order-stage call sites
  admin_price?: string | null
  discount?: string | null
  delivery_charge?: string | null
  final_price?: string | number | null   // order-stage frozen price, takes precedence over admin_price/discount when present
  confirmationLinkUrl?: string       // precomputed server-side (confirmationLink(token))
  fallbackLinkUrl?: string           // precomputed tracking/my-orders link, used for order-delivered & balance-due messages
}

function withGuaranteedLink(text: string, link?: string): string {
  if (!link) return text
  return text.includes(link) ? text : `${text}\n\n${link}`
}

export function pickWhatsAppAction(
  input: WhatsAppActionInput,
  templates: WhatsAppTemplates | undefined
): { label: string; text: string; linkUrl?: string; kind: 'confirmation' | 'balance-due' | 'order-delivered' | 'plain' } {
  const firstName = input.customer_name.split(' ')[0]

  // 1. Not yet confirmed by the customer
  if (input.customer_confirmed === false) {
    if (input.admin_price && input.confirmationLinkUrl) {
      const rawText = interpolate(
        templates?.confirmationLink ?? DEFAULT_WHATSAPP_TEMPLATES.confirmationLink,
        { name: firstName, link: input.confirmationLinkUrl }
      )
      const text = withGuaranteedLink(rawText, input.confirmationLinkUrl)
      return { label: 'Send Confirmation', text, linkUrl: input.confirmationLinkUrl, kind: 'confirmation' }
    }
    // falls through to plain below
  } else {
    // 2. Outstanding balance
    const balance = input.final_price != null
      ? balanceOwed(input.final_price, input.amount_paid, input.fully_paid)
      : balanceOwed(orderTotal(input.admin_price ?? null, input.discount ?? null, input.delivery_charge ?? null), input.amount_paid, input.fully_paid)

    if (balance > 0) {
      if (input.fallbackLinkUrl) {
        const rawText = interpolate(
          templates?.balanceDue ?? DEFAULT_WHATSAPP_TEMPLATES.balanceDue,
          { name: firstName, amount: balance.toFixed(3), link: input.fallbackLinkUrl }
        )
        const text = withGuaranteedLink(rawText, input.fallbackLinkUrl)
        return {
          label: `Balance Due — KD ${balance.toFixed(3)}`,
          text,
          linkUrl: input.fallbackLinkUrl,
          kind: 'balance-due',
        }
      }
      // no link available for balance-due — downgrade to plain below
    } else if (input.status === 'confirmed' || input.status === undefined) {
      // 3. Order delivered (or order-stage call site with no status field at all)
      if (input.fallbackLinkUrl) {
        const rawText = interpolate(
          templates?.orderDelivered ?? DEFAULT_WHATSAPP_TEMPLATES.orderDelivered,
          { name: firstName, link: input.fallbackLinkUrl }
        )
        const text = withGuaranteedLink(rawText, input.fallbackLinkUrl)
        return { label: 'Order Delivered', text, linkUrl: input.fallbackLinkUrl, kind: 'order-delivered' }
      }
      // no link available for order-delivered — downgrade to plain below
    }
  }

  // 4. Plain / freeform fallback
  return { label: 'Message Customer', text: '', kind: 'plain' }
}

export interface ReceiptActionInput {
  customer_name: string
  amount: number | string        // THIS payment's amount
  amount_paid: number | string   // cumulative paid to date, through this payment
  order_total: number | string
  receiptLinkUrl: string         // precomputed server-side via receiptLink(token)
}

export function buildReceiptAction(
  input: ReceiptActionInput,
  templates: WhatsAppTemplates | undefined
): { text: string; linkUrl: string } {
  const firstName = input.customer_name.split(' ')[0]
  const amount = Number(input.amount ?? 0)
  const paid = Number(input.amount_paid ?? 0)
  const total = Number(input.order_total ?? 0)
  const balance = Math.max(0, total - paid)
  const rawText = interpolate(
    templates?.paymentReceived ?? DEFAULT_WHATSAPP_TEMPLATES.paymentReceived,
    {
      name: firstName,
      amount: amount.toFixed(3),
      paid: paid.toFixed(3),
      total: total.toFixed(3),
      balance: balance.toFixed(3),
      link: input.receiptLinkUrl,
    }
  )
  return { text: withGuaranteedLink(rawText, input.receiptLinkUrl), linkUrl: input.receiptLinkUrl }
}
