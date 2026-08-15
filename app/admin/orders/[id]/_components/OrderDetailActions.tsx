'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus, cancelOrder } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { Copy, Check, Printer, ArrowRight, X, Image, Spinner } from '@phosphor-icons/react'
import { toPng } from 'html-to-image'
import { useAdminHeader } from '@/components/admin/AdminHeaderContext'
import type { OrderStatus } from '@/lib/supabase/types'

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  confirmed: { status: 'delivered', label: 'Mark Delivered' },
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
  const [advancing, startAdvance] = useTransition()
  const [cancelling, startCancel] = useTransition()
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const pending = advancing || cancelling
  const next = NEXT_STATUS[order.status]
  const canCancel = order.status !== 'delivered' && order.status !== 'cancelled'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trackingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAdvance = () => {
    if (!next) return
    startAdvance(async () => {
      const result = await updateOrderStatus(order.id, next.status)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status updated')
        router.refresh()
      }
    })
  }

  const handleCancel = () => {
    if (!confirm('Cancel this order?')) return
    startCancel(async () => {
      const result = await cancelOrder(order.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Order cancelled')
        router.refresh()
      }
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
    } catch {
      toast.error('Could not generate image')
    } finally {
      setDownloading(false)
    }
  }

  // Mobile: the customer's name replaces the sticky header's default section
  // title, with a back link to the orders list. Print / Download / Cancel
  // move into that header's overflow menu (the buttons below are hidden on
  // mobile) — they're occasional or destructive, and this keeps them
  // reachable without scrolling to the bottom of a long order page.
  useAdminHeader({
    title: inquiry.customer_name || 'Order',
    backHref: '/admin/orders',
    menuItems: [
      {
        key: 'print',
        label: 'Print / Save PDF',
        icon: Printer,
        onClick: () => window.print(),
      },
      {
        key: 'download',
        label: downloading ? 'Generating…' : 'Download as Image',
        icon: downloading ? Spinner : Image,
        spinning: downloading,
        disabled: downloading,
        onClick: handleDownloadImage,
      },
      ...(canCancel
        ? [
            {
              key: 'cancel',
              label: cancelling ? 'Cancelling…' : 'Cancel Order',
              icon: cancelling ? Spinner : X,
              spinning: cancelling,
              disabled: pending,
              danger: true,
              onClick: handleCancel,
            },
          ]
        : []),
    ],
  })

  return (
    <div className="flex flex-col gap-3 mb-8">
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
          {next.label}
          {advancing ? <Spinner size={15} className="animate-spin" /> : <ArrowRight size={15} />}
        </button>
      )}

      {/* Print / Save PDF — mobile reaches this via the sticky header's overflow menu */}
      <button
        type="button"
        onClick={() => window.print()}
        className="hidden md:flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <Printer size={15} />
        Print / Save PDF
      </button>

      {/* Download as Image — mobile reaches this via the sticky header's overflow menu */}
      <button
        type="button"
        onClick={handleDownloadImage}
        disabled={downloading}
        className="hidden md:flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        {downloading ? <Spinner size={15} className="animate-spin" /> : <Image size={15} />}
        {downloading ? 'Generating…' : 'Download as Image'}
      </button>

      {/* Cancel — mobile reaches this via the sticky header's overflow menu */}
      {canCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="hidden md:flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
          }}
        >
          {cancelling ? <Spinner size={15} className="animate-spin" /> : <X size={15} />}
          Cancel Order
        </button>
      )}
    </div>
  )
}
