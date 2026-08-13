import { format, parseISO } from 'date-fns'
import type { Governorate, InquiryStatus, OrderStatus } from './supabase/types'

export function formatDate(date: string): string {
  return format(parseISO(date), 'dd/MM/yyyy')
}

export function formatDateLong(date: string): string {
  return format(parseISO(date), 'EEEE, dd/MM/yyyy')
}

export function formatTime(time: string | null): string {
  if (!time || !time.includes(':')) return '—'
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

export function formatKWD(value: string | null | undefined): string {
  if (!value) return '—'
  return `KD ${parseFloat(value).toFixed(3)}`
}

type OrderSummaryItem = { order_type: string; item_name: string; cake_size: string; flavor: string; quantity: number }

function itemDescription(item: OrderSummaryItem): string {
  return item.order_type === 'other_item' ? item.item_name : `${item.cake_size} · ${item.flavor}`
}

// Short display string for everything ordered on an inquiry — a cake's size/flavor, or the
// free-text item name for non-cake items (see order_type on InquiryItem), joined across all
// items in the order. Renders identically to the old single-item shape when there's exactly
// one item (still the common case). With more than one item, each is prefixed with its
// quantity so the list reads unambiguously, e.g.
// "2× Medium · Chocolate, 1× Large · Red Velvet".
export function orderSummary(items: OrderSummaryItem[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return itemDescription(items[0])
  return items.map((item) => `${item.quantity}× ${itemDescription(item)}`).join(', ')
}

export function formatAddress(addr: {
  governorate: string
  area: string
  block: string
  street: string
  house_no: string
} | null | undefined): string {
  if (!addr) return ''
  return [
    GOVERNORATE_LABELS[addr.governorate as Governorate],
    addr.area,
    `Block ${addr.block}`,
    addr.street,
    addr.house_no,
  ].filter(Boolean).join(', ')
}

export interface CustomerEditDiffEntry {
  field: string
  label: string
  before: string
  after: string
}

// Compares the inquiry's original customer-editable fields against what the customer
// submitted on the confirm/request-changes form, so admins can see exactly what changed
// instead of finalizing an order blind to edits.
export function buildCustomerEditDiff(
  original: {
    pickup_time: string | null
    message_on_cake: string
    special_requirements: string
    delivery_address?: { governorate: string; area: string; block: string; street: string; house_no: string } | null
  },
  edits: { pickup_time: string | null | undefined; message_on_cake: string; special_requirements: string },
  newAddress?: { governorate: string; area: string; block: string; street: string; house_no: string } | null
): CustomerEditDiffEntry[] {
  const diff: CustomerEditDiffEntry[] = []

  if ((original.pickup_time ?? '') !== (edits.pickup_time ?? '')) {
    diff.push({
      field: 'pickup_time',
      label: 'Pickup / Delivery Time',
      before: original.pickup_time ? formatTime(original.pickup_time) : 'Not set',
      after: edits.pickup_time ? formatTime(edits.pickup_time) : 'Not set',
    })
  }

  if ((original.message_on_cake ?? '') !== (edits.message_on_cake ?? '')) {
    diff.push({
      field: 'message_on_cake',
      label: 'Message on Cake',
      before: original.message_on_cake || '—',
      after: edits.message_on_cake || '—',
    })
  }

  if ((original.special_requirements ?? '') !== (edits.special_requirements ?? '')) {
    diff.push({
      field: 'special_requirements',
      label: 'Special Requirements',
      before: original.special_requirements || '—',
      after: edits.special_requirements || '—',
    })
  }

  if (newAddress) {
    const beforeAddr = formatAddress(original.delivery_address)
    const afterAddr = formatAddress(newAddress)
    if (beforeAddr !== afterAddr) {
      diff.push({
        field: 'delivery_address',
        label: 'Delivery Address',
        before: beforeAddr || 'Not set',
        after: afterAddr,
      })
    }
  }

  return diff
}

export const GOVERNORATE_LABELS: Record<Governorate, string> = {
  capital: 'Capital (Asimah)',
  hawalli: 'Hawalli',
  farwaniyah: 'Farwaniyah',
  ahmadi: 'Ahmadi',
  jahra: 'Jahra',
  mubarak_al_kabeer: 'Mubarak Al-Kabeer',
}

// Admin-facing labels. 'delivered' reads as "Dispatched" here — the DB value is unchanged,
// this is a UI-only relabel for the admin flow (Confirmed -> Ready -> Dispatched).
// Customer-facing copy (e.g. app/track, app/my-orders) keeps its own separate "Delivered"
// wording and does not import this map — do not repoint those pages at this constant without
// checking that first.
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: 'Inquired',
  confirmed: 'Confirmed',
  ready: 'Ready',
  delivered: 'Dispatched',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: 'Order Confirmed',
  ready: 'Ready for Pickup',
  delivered: 'Dispatched',
  cancelled: 'Cancelled',
}
