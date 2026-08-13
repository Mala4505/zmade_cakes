import { createClient } from '@/lib/supabase/server'
import { formatKWD } from '@/lib/utils'
import { PageHeader } from '@/components/admin/PageHeader'
import ExportButton from './_components/ExportButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

async function getAnalyticsData() {
  const supabase = await createClient()

  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - 12)
  cutoffDate.setDate(1)
  const cutoff = cutoffDate.toISOString().split('T')[0]

  const [revenueRes, flavorRes, sizeRes, allStatusRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('event_date, admin_price')
      .neq('status', 'cancelled')
      .gte('event_date', cutoff)
      .not('admin_price', 'is', null),

    // Queried directly against inquiry_items (joined to inquiries only for the
    // status filter) rather than one-flavor-per-inquiry, so a 2-item inquiry
    // correctly contributes 2 counts to the aggregation below. This intentionally
    // shifts the reported numbers vs. the old single-item aggregation — expected,
    // not a bug.
    supabase
      .from('inquiry_items')
      .select('flavor, inquiry:inquiries!inner(status)')
      .eq('order_type', 'cake')
      .neq('flavor', '')
      .neq('inquiry.status', 'cancelled'),

    supabase
      .from('inquiry_items')
      .select('cake_size, inquiry:inquiries!inner(status)')
      .eq('order_type', 'cake')
      .neq('cake_size', '')
      .neq('inquiry.status', 'cancelled'),

    supabase
      .from('inquiries')
      .select('status'),
  ])

  const queryResults = {
    revenue: revenueRes,
    flavors: flavorRes,
    sizes: sizeRes,
    statuses: allStatusRes,
  }
  for (const [name, res] of Object.entries(queryResults)) {
    if (res.error) throw new Error(`Analytics: failed to load ${name} — ${res.error.message}`)
  }

  // Build 12-month revenue array
  const monthMap: Record<string, number> = {}
  for (const row of (revenueRes.data ?? [])) {
    const key = (row.event_date as string).slice(0, 7)
    monthMap[key] = (monthMap[key] ?? 0) + (row.admin_price ?? 0)
  }

  const months: { label: string; key: string; revenue: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    months.push({ key, label, revenue: monthMap[key] ?? 0 })
  }
  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1)

  // Top flavors
  const flavorCounts: Record<string, number> = {}
  for (const row of (flavorRes.data ?? [])) {
    if (row.flavor) flavorCounts[row.flavor] = (flavorCounts[row.flavor] ?? 0) + 1
  }
  const topFlavors = Object.entries(flavorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Top sizes
  const sizeCounts: Record<string, number> = {}
  for (const row of (sizeRes.data ?? [])) {
    if (row.cake_size) sizeCounts[row.cake_size] = (sizeCounts[row.cake_size] ?? 0) + 1
  }
  const topSizes = Object.entries(sizeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Conversion & avg order value
  const all = allStatusRes.data ?? []
  const confirmedStatuses = ['confirmed', 'ready', 'delivered']
  const confirmedCount = all.filter((r) => confirmedStatuses.includes(r.status)).length
  const conversionRate = all.length > 0 ? Math.round((confirmedCount / all.length) * 100) : 0

  const pricedRows = revenueRes.data ?? []
  const totalRevenue12m = pricedRows.reduce((s, r) => s + (r.admin_price ?? 0), 0)
  const avgOrderValue = pricedRows.length > 0 ? totalRevenue12m / pricedRows.length : 0

  return {
    months,
    maxRevenue,
    topFlavors,
    topSizes,
    conversionRate,
    avgOrderValue,
    totalOrders: all.length,
    confirmedCount,
  }
}

export default async function AnalyticsPage() {
  const {
    months,
    maxRevenue,
    topFlavors,
    topSizes,
    conversionRate,
    avgOrderValue,
    totalOrders,
    confirmedCount,
  } = await getAnalyticsData()

  const now = new Date()
  const exportYear = now.getFullYear()
  const exportMonth = now.getMonth() + 1
  const exportMonthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' })

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-0">
        <PageHeader title="Analytics" />
        <ExportButton year={exportYear} month={exportMonth} monthLabel={exportMonthLabel} />
      </div>

      {/* Revenue bar chart */}
      <div
        className="rounded-xl border overflow-hidden mb-6"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
            Monthly Revenue — Last 12 Months (KD)
          </h2>
        </div>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-end gap-1" style={{ height: '120px' }}>
            {months.map((m) => {
              const pct = m.revenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t"
                      title={`${m.label}: ${formatKWD(m.revenue.toFixed(3))}`}
                      style={{
                        height: m.revenue > 0 ? `${Math.max(pct, 3)}%` : '3%',
                        backgroundColor: m.revenue > 0 ? 'var(--color-teal)' : 'var(--color-border)',
                        opacity: m.revenue > 0 ? 1 : 0.5,
                        transition: 'height 0.2s ease',
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] leading-none whitespace-nowrap"
                    style={{ color: 'var(--color-ink-muted)' }}
                  >
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Total Inquiries" value={String(totalOrders)} />
        <SummaryCard label="Confirmed" value={String(confirmedCount)} />
        <SummaryCard label="Conversion Rate" value={`${conversionRate}%`} />
        <SummaryCard label="Avg. Order Value" value={formatKWD(avgOrderValue.toFixed(3))} />
      </div>

      {/* Bar lists */}
      <div className="grid md:grid-cols-2 gap-6">
        <BarList title="Top Flavors" items={topFlavors} />
        <BarList title="Cake Sizes" items={topSizes} />
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <span
        className="text-2xl font-semibold tracking-tight"
        style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
    </div>
  )
}

function BarList({ title, items }: { title: string; items: [string, number][] }) {
  const max = items[0]?.[1] ?? 1
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
          {title}
        </h2>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-ink-muted)' }}>
            No data yet
          </p>
        ) : (
          items.map(([name, count]) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>
                  {name}
                </span>
                <span
                  className="text-xs ml-3 shrink-0 tabular-nums"
                  style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {count}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: 'var(--color-teal)',
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
