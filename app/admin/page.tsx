import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateLong, formatKWD, orderSummary } from '@/lib/utils'
import { derivePaymentStatus, balanceOwed, orderTotal } from '@/lib/payments'
import { StatusBadge } from '@/components/admin/StatusBadge'
import Link from 'next/link'
import { ClipboardText, Package, Bell, ArrowRight, Plus, Warning, CalendarBlank, Wallet, TrendUp } from '@phosphor-icons/react/dist/ssr'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

async function getDashboardData() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = thisMonthStart

  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
  const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0]

  const [pendingRes, todayRes, activeOrdersRes, notificationsRes, thisMonthRes, lastMonthRes, newCustomersRes, lastMonthCustomersRes, urgentOrdersRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    supabase
      .from('inquiries')
      .select('id, customer_name, pickup_time, delivery_type, status, items:inquiry_items(*)')
      .eq('event_date', today)
      .not('status', 'in', '(cancelled,delivered)')
      .order('pickup_time', { ascending: true }),

    supabase
      .from('orders')
      .select('id, status, final_price, inquiry:inquiries(customer_name, event_date, deposit_amount, amount_paid, admin_price, discount, delivery_charge, fully_paid, items:inquiry_items(*))')
      .in('status', ['confirmed'])
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('inquiries')
      .select('admin_price')
      .in('status', ['confirmed', 'delivered'])
      .gte('created_at', thisMonthStart),

    supabase
      .from('inquiries')
      .select('admin_price')
      .in('status', ['confirmed', 'delivered'])
      .gte('created_at', lastMonthStart)
      .lt('created_at', lastMonthEnd),

    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart),

    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', lastMonthStart)
      .lt('created_at', lastMonthEnd),

    supabase
      .from('orders')
      .select('id, status, inquiry:inquiries(id, customer_name, event_date, items:inquiry_items(*))')
      .in('status', ['confirmed']),
  ])

  const queryResults = {
    'pending count': pendingRes,
    "today's events": todayRes,
    'active orders': activeOrdersRes,
    notifications: notificationsRes,
    "this month's revenue": thisMonthRes,
    "last month's revenue": lastMonthRes,
    'new customers': newCustomersRes,
    "last month's customers": lastMonthCustomersRes,
    'urgent orders': urgentOrdersRes,
  }
  for (const [name, res] of Object.entries(queryResults)) {
    if (res.error) throw new Error(`Dashboard: failed to load ${name} — ${res.error.message}`)
  }

  const activeOrders = activeOrdersRes.data ?? []

  const urgentOrders = (urgentOrdersRes.data ?? []).filter((o: any) => {
    const eventDate = o.inquiry?.event_date
    return eventDate && eventDate <= twoDaysStr && eventDate >= today
  })

  const pendingPayments = activeOrders.filter((o: any) => {
    const inq = o.inquiry
    if (!inq?.admin_price) return false
    return derivePaymentStatus(
      inq.amount_paid,
      orderTotal(inq.admin_price, inq.discount, inq.delivery_charge),
      inq.fully_paid,
    ) !== 'paid'
  })

  const thisMonthData = thisMonthRes.data ?? []
  const lastMonthData = lastMonthRes.data ?? []
  const thisMonthRevenue = thisMonthData.reduce((s, r: any) => s + (parseFloat(r.admin_price) || 0), 0)
  const lastMonthRevenue = lastMonthData.reduce((s, r: any) => s + (parseFloat(r.admin_price) || 0), 0)

  return {
    pendingCount: pendingRes.count ?? 0,
    todayPickups: todayRes.data ?? [],
    activeOrders,
    pendingPayments,
    urgentOrders,
    notifications: notificationsRes.data ?? [],
    unreadCount: (notificationsRes.data ?? []).filter((n) => !n.is_read).length,
    monthlyStats: {
      revenue: thisMonthRevenue,
      revenueDelta: thisMonthRevenue - lastMonthRevenue,
      orders: thisMonthData.length,
      ordersDelta: thisMonthData.length - lastMonthData.length,
      newCustomers: newCustomersRes.count ?? 0,
      newCustomersDelta: (newCustomersRes.count ?? 0) - (lastMonthCustomersRes.count ?? 0),
    },
  }
}

export default async function DashboardPage() {
  const { pendingCount, todayPickups, activeOrders, pendingPayments, urgentOrders, notifications, unreadCount, monthlyStats } =
    await getDashboardData()

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          {formatDateLong(new Date().toISOString())}
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
          New Order
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

      {/* Urgency alerts */}
      {urgentOrders.length > 0 && (
        <section
          className="rounded-xl border p-4 mb-6"
          style={{ backgroundColor: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}
        >
          <h2
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-warning)' }}
          >
            <Warning size={15} weight="fill" />
            Urgent — Event within 2 days
          </h2>
          <ul className="flex flex-col gap-2">
            {urgentOrders.map((o: any) => (
              <li key={o.id}>
                <a
                  href={`/admin/orders/${o.id}`}
                  className="text-sm"
                  style={{ color: 'var(--color-warning)' }}
                >
                  {o.inquiry?.customer_name} — {o.inquiry ? orderSummary(o.inquiry.items ?? []) : ''} on {o.inquiry?.event_date}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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

      {/* Monthly stats */}
      <MonthlyStats {...monthlyStats} />

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
                  {orderSummary(inq.items ?? [])}
                </p>
              </div>
              <div className="ml-4 text-right shrink-0">
                <StatusBadge status={inq.status} context="admin" />
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
                  {order.inquiry ? orderSummary(order.inquiry.items ?? []) : '—'} · {order.inquiry?.event_date ? formatDate(order.inquiry.event_date) : '—'}
                </p>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <StatusBadge status={order.status} context="admin" />
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
                const balance = inq
                  ? balanceOwed(order.final_price, inq.amount_paid, inq.fully_paid)
                  : 0
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
                      {balance > 0 && (
                        <p
                          className="text-sm font-semibold font-mono"
                          style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}
                        >
                          {formatKWD(balance.toFixed(3))}
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
            href="/admin/notifications"
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

function MonthlyStats({
  revenue,
  revenueDelta,
  orders,
  ordersDelta,
  newCustomers,
  newCustomersDelta,
}: {
  revenue: number
  revenueDelta: number
  orders: number
  ordersDelta: number
  newCustomers: number
  newCustomersDelta: number
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden mb-8"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-teal)' }}>
          <TrendUp size={15} weight="fill" />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          This Month
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3">
        <MonthStatItem
          label="Revenue"
          value={formatKWD(revenue.toFixed(3))}
          delta={revenueDelta}
          formatDelta={(v) => formatKWD(Math.abs(v).toFixed(3))}
        />
        <MonthStatItem
          label="Orders"
          value={String(orders)}
          delta={ordersDelta}
          formatDelta={(v) => String(Math.abs(v))}
        />
        <MonthStatItem
          label="New Customers"
          value={String(newCustomers)}
          delta={newCustomersDelta}
          formatDelta={(v) => String(Math.abs(v))}
        />
      </div>
    </div>
  )
}

function MonthStatItem({
  label,
  value,
  delta,
  formatDelta,
}: {
  label: string
  value: string
  delta: number
  formatDelta: (v: number) => string
}) {
  const positive = delta > 0
  const neutral = delta === 0
  return (
    <div
      className="px-5 py-4 flex flex-col gap-0.5 border-b sm:border-b-0 sm:border-r last:border-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span
        className="text-xl font-semibold tracking-tight"
        style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      {!neutral && (
        <span
          className="text-[11px] font-medium mt-1"
          style={{ color: positive ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {positive ? '+' : '−'}{formatDelta(delta)} vs last month
        </span>
      )}
    </div>
  )
}

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
