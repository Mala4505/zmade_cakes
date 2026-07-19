'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, cancelOrder } from '@/lib/actions/orders'
import { Copy, Check, Printer, ArrowRight, X, Image } from '@phosphor-icons/react'
import { toPng } from 'html-to-image'
import type { OrderStatus } from '@/lib/supabase/types'

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  confirmed: { status: 'ready', label: 'Mark Ready' },
  ready: { status: 'delivered', label: 'Mark Dispatched' },
}

export default function OrderDetailActions({
  order,
  trackingLink,
  inquiry,
}: {
  order: { id: string; status: OrderStatus }
  trackingLink: string
  inquiry: { customer_name: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const next = NEXT_STATUS[order.status]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trackingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAdvance = () => {
    if (!next) return
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, next.status)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  const handleCancel = () => {
    if (!confirm('Cancel this order?')) return
    startTransition(async () => {
      const result = await cancelOrder(order.id)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  const handleDownloadImage = async () => {
    const el = document.getElementById('invoice')
    if (!el) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(el, { cacheBust: true })
      const link = document.createElement('a')
      link.download = `zmade-invoice-${inquiry.customer_name.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 mb-8">
      {error && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      )}

      {/* Tracking link */}
      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          Customer Tracking Link
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-raised)',
            color: 'var(--color-ink-secondary)',
          }}
        >
          {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
          {copied ? 'Copied!' : 'Copy Tracking Link'}
        </button>
        <p className="text-xs break-all" style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
          {trackingLink}
        </p>
      </div>

      {/* Advance status */}
      {next && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={pending}
          className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
        >
          {pending ? 'Updating…' : next.label} {!pending && <ArrowRight size={15} />}
        </button>
      )}

      {/* Print / Save PDF */}
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <Printer size={15} />
        Print / Save PDF
      </button>

      {/* Download as Image */}
      <button
        type="button"
        onClick={handleDownloadImage}
        disabled={downloading}
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <Image size={15} />
        {downloading ? 'Generating…' : 'Download as Image'}
      </button>

      {/* Cancel */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
          }}
        >
          <X size={15} />
          Cancel Order
        </button>
      )}
    </div>
  )
}
