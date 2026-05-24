import { createClient } from '@/lib/supabase/server'
import { formatDate, formatKWD } from '@/lib/utils'
import { INQUIRY_STATUS_LABELS } from '@/lib/utils'
import Link from 'next/link'
import { ClipboardText, Package, Bell, ArrowRight, Plus, Warning, CalendarBlank, Wallet } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

async function getDashboardData() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [pendingRes, todayRes, activeOrdersRes, notificationsRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'awaiting_confirmation']),

    supabase
      .from('inquiries')
      .select('id, customer_name, cake_size, flavor, pickup_time, delivery_type, status')
      .eq('event_date', today)
      .not('status', 'in', '(cancelled,delivered)')
      .order('pickup_time', { ascending: true }),

    supabase
      .from('orders')
      .select('id, status, final_price, inquiry:inquiries(customer_name, cake_size, flavor, event_date, advance_amount, admin_price, balance_paid)')
      .in('status', ['confirmed', 'in_progress', 'ready'])
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const activeOrders = activeOrdersRes.data ?? []

  const pendingPayments = activeOrders.filter((o: any) => {
    const inq = o.inquiry
    return inq?.admin_price && inq?.advance_amount && !inq?.balance_paid
  })

  return {
    pendingCount: pendingRes.count ?? 0,
    todayPickups: todayRes.data ?? [],
    activeOrders,
    pendingPayments,
    notifications: notificationsRes.data ?? [],
    unreadCount: (notificationsRes.data ?? []).filter((n) => !n.is_read).length,
  }
}

export default async function DashboardPage() {
  const { pendingCount, todayPickups, activeOrders, pendingPayments, notifications, unreadCount } =
    await getDashboardData()

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          {new Date().toLocaleDateString('en-KW', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/admin/inquiries/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          <Plus size={15} weight="bold" />
          New Inquiry
        </Link>
        <Link
          href="/admin/calendar"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          <CalendarBlank size={15} />
          Today's Orders
        </Link>
        {pendingCount > 0 && (
          <Link
            href="/admin/inquiries?status=pending"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border"
            style={{
              borderColor: 'var(--color-warning)',
              backgroundColor: 'var(--color-warning-light)',
              color: 'var(--color-warning)',
            }}
          >
            <Warning size={15} weight="fill" />
            {pendingCount} Pending
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Pending"
          value={pendingCount}
          href="/admin/inquiries?status=pending"
          accent={pendingCount > 0}
        />
        <StatCard
          label="Active orders"
          value={activeOrders.length}
          href="/admin/orders"
          accent={false}
        />
        <StatCard
          label="Today's events"
          value={todayPickups.length}
          href="/admin/calendar"
          accent={todayPickups.length > 0}
        />
        <StatCard
          label="Unread"
          value={unreadCount}
          href="#notifications"
          accent={unreadCount > 0}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's pickups */}
        <Section
          title="Today's Events"
          icon={<Package size={15} weight="fill" />}
          href="/admin/calendar"
          empty={todayPickups.length === 0}
          emptyText="No cakes due today"
        >
          {todayPickups.map((inq: any) => (
            <Link
              key={inq.id}
              href={`/admin/inquiries/${inq.id}`}
              className="flex items-start justify-between py-3 border-b last:border-0 group"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {inq.customer_name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
                  {inq.cake_size} · {inq.flavor}
                </p>
              </div>
              <div className="ml-4 text-right shrink-0">
                <StatusBadge status={inq.status} />
                {inq.pickup_time && (
                  <p
                    className="text-xs mt-1 font-mono"
                    style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatPickupTime(inq.pickup_time)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </Section>

        {/* Active orders */}
        <Section
          title="Active Orders"
          icon={<Package size={15} weight="fill" />}
          href="/admin/orders"
          empty={activeOrders.length === 0}
          emptyText="No active orders"
        >
          {activeOrders.map((order: any) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex items-start justify-between py-3 border-b last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {order.inquiry?.customer_name ?? '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                  {order.inquiry?.cake_size} · {order.inquiry?.event_date ? formatDate(order.inquiry.event_date) : '—'}
                </p>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <OrderStatusBadge status={order.status} />
                <p
                  className="text-xs mt-1 font-mono"
                  style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatKWD(order.final_price)}
                </p>
              </div>
            </Link>
          ))}
        </Section>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <div className="md:col-span-2">
            <Section
              title="Pending Payments"
              icon={<Wallet size={15} weight="fill" />}
              href="/admin/orders"
              empty={false}
              emptyText=""
            >
              {pendingPayments.map((order: any) => {
                const inq = order.inquiry
                const balance = inq?.admin_price && inq?.advance_amount
                  ? (parseFloat(inq.admin_price) - parseFloat(inq.advance_amount)).toFixed(3)
                  : null
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-start justify-between py-3 border-b last:border-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                        {inq?.customer_name ?? '—'}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      {balance && (
                        <p
                          className="text-sm font-semibold font-mono"
                          style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}
                        >
                          KD {balance}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>balance due</p>
                    </div>
                  </Link>
                )
              })}
            </Section>
          </div>
        )}

        {/* Notifications */}
        <div id="notifications" className="md:col-span-2">
          <Section
            title="Recent Activity"
            icon={<Bell size={15} weight="fill" />}
            href="#"
            empty={notifications.length === 0}
            emptyText="No activity yet"
          >
            {notifications.map((notif: any) => (
              <div
                key={notif.id}
                className="flex items-start gap-3 py-3 border-b last:border-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {!notif.is_read && (
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--color-teal)' }}
                  />
                )}
                <div className={`min-w-0 flex-1 ${notif.is_read ? 'ml-4' : ''}`}>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {notif.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-muted)' }}>
                    {notif.body}
                  </p>
                </div>
                <time
                  className="text-[11px] shrink-0 mt-0.5"
                  style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {relativeTime(notif.created_at)}
                </time>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ---- Sub-components ---- */

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string
  value: number
  href: string
  accent: boolean
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-4 flex flex-col gap-1 transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: accent ? 'var(--color-teal-light)' : 'var(--color-border)',
      }}
    >
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{
          color: accent ? 'var(--color-teal)' : 'var(--color-ink)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {value}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
    </Link>
  )
}

function Section({
  title,
  icon,
  href,
  empty,
  emptyText,
  children,
}: {
  title: string
  icon: React.ReactNode
  href: string
  empty: boolean
  emptyText: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--color-teal)' }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
            {title}
          </span>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--color-teal)' }}
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="px-4">
        {empty ? (
          <p className="py-8 text-sm text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {emptyText}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
    awaiting_confirmation: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
    confirmed: { bg: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' },
    in_progress: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
    ready: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
    delivered: { bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
    cancelled: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' },
  }
  const s = styles[status] ?? styles.pending
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {INQUIRY_STATUS_LABELS[status as keyof typeof INQUIRY_STATUS_LABELS] ?? status}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    confirmed: { bg: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' },
    in_progress: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
    ready: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
    delivered: { bg: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' },
    cancelled: { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' },
  }
  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    in_progress: 'Making',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  const s = styles[status] ?? styles.confirmed
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {labels[status] ?? status}
    </span>
  )
}

function formatPickupTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
