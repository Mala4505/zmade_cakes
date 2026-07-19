import { format, parseISO } from 'date-fns'
import type { Governorate, InquiryStatus, OrderStatus } from './supabase/types'

export function formatDate(date: string): string {
  return format(parseISO(date), 'dd MMM yyyy')
}

export function formatDateLong(date: string): string {
  return format(parseISO(date), 'EEEE, dd MMMM yyyy')
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
  pending: 'Pending',
  awaiting_confirmation: 'Awaiting Confirmation',
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
