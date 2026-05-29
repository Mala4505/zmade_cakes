'use client'

import { useState } from 'react'
import { exportMonthlyOrdersCSV } from '@/lib/actions/export'

interface Props {
  year: number
  month: number
  monthLabel: string
}

export default function ExportButton({ year, month, monthLabel }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    const { data, error } = await exportMonthlyOrdersCSV(year, month)
    setLoading(false)
    if (error || !data) return
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zmade-orders-${year}-${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="rounded-lg border px-3.5 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border-strong)',
        color: loading ? 'var(--color-ink-muted)' : 'var(--color-ink)',
      }}
      onMouseEnter={(e) => {
        if (!loading) e.currentTarget.style.borderColor = 'var(--color-border-strong)'
        e.currentTarget.style.backgroundColor = 'var(--color-surface)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'
      }}
    >
      {loading ? 'Exporting…' : `Export ${monthLabel}`}
    </button>
  )
}
