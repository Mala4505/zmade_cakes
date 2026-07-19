'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/actions/orders'
import { toast } from 'sonner'
import { ArrowRight, Spinner } from '@phosphor-icons/react'
import type { OrderStatus } from '@/lib/supabase/types'

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  confirmed: { status: 'ready', label: 'Mark Ready' },
  ready: { status: 'delivered', label: 'Mark Dispatched' },
}

export default function OrderStatusActions({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: OrderStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const next = NEXT_STATUS[currentStatus]
  if (!next) return null

  const handleAdvance = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next.status)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status updated')
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleAdvance}
      disabled={pending}
      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
    >
      {next.label}
      {pending ? <Spinner size={12} className="animate-spin" /> : <ArrowRight size={12} />}
    </button>
  )
}
