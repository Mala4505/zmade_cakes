'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelOrder } from '@/lib/actions/orders'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { toast } from 'sonner'
import { Printer, ArrowClockwise, X, Image, Spinner } from '@phosphor-icons/react'
import { toPng } from 'html-to-image'
import { useAdminHeader } from '@/components/admin/AdminHeaderContext'
import type { OrderStatus } from '@/lib/supabase/types'

export default function OrderDetailActions({
  order,
  inquiry,
}: {
  order: { id: string; status: OrderStatus }
  inquiry: { customer_name: string; id: string }
}) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)

  const canCancel = order.status !== 'delivered' && order.status !== 'cancelled'

  const { run: runCancel, pending: cancelling } = useAsyncAction(
    async () => {
      const result = await cancelOrder(order.id)
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'Order cancelled',
      onSuccess: () => router.refresh(),
    }
  )

  const handleCancel = () => {
    if (!confirm('Cancel this order?')) return
    runCancel()
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
  // title, with a back link to the orders list. Repeat / Print / Download / Cancel
  // move into that header's overflow menu (the buttons below are hidden on
  // mobile) — they're occasional or destructive, and this keeps them
  // reachable without scrolling to the bottom of a long order page.
  useAdminHeader({
    title: inquiry.customer_name || 'Order',
    backHref: '/admin/orders',
    menuItems: [
      {
        key: 'repeat',
        label: 'Repeat this Order',
        icon: ArrowClockwise,
        onClick: () => router.push(`/admin/orders/new?from=${inquiry.id}`),
      },
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
              disabled: cancelling,
              danger: true,
              onClick: handleCancel,
            },
          ]
        : []),
    ],
  })

  return null
}
