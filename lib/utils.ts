import { format, parseISO } from 'date-fns'
import type { Governorate, InquiryStatus, OrderStatus, Priority } from './supabase/types'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'dd MMM yyyy')
}

export function formatDateLong(date: string): string {
  return format(parseISO(date), 'EEEE, dd MMMM yyyy')
}

export function formatTime(time: string | null): string {
  if (!time) return '—'
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

export function confirmationLink(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${token}`
}

export function trackingLink(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/track/${token}`
}

export const GOVERNORATE_LABELS: Record<Governorate, string> = {
  capital: 'Capital (Asimah)',
  hawalli: 'Hawalli',
  farwaniyah: 'Farwaniyah',
  ahmadi: 'Ahmadi',
  jahra: 'Jahra',
  mubarak_al_kabeer: 'Mubarak Al-Kabeer',
}

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: 'Pending',
  awaiting_confirmation: 'Awaiting Confirmation',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: 'Order Confirmed',
  in_progress: 'Being Made',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'Normal',
  1: 'High',
  2: 'Urgent',
}
