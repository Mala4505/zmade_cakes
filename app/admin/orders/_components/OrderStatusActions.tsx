'use client'

import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/actions/orders'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { ArrowRight, Spinner } from '@phosphor-icons/react'
import type { OrderStatus } from '@/lib/supabase/types'

const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  confirmed: { status: 'delivered', label: 'Mark Delivered' },
}

export default function OrderStatusActions({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: OrderStatus
}) {
  const router = useRouter()
  const next = NEXT_STATUS[currentStatus]

  const { run: handleAdvance, pending } = useAsyncAction(
    async () => {
      if (!next) return false
      const result = await updateOrderStatus(orderId, next.status)
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'Status updated',
      onSuccess: () => router.refresh(),
    }
  )

  if (!next) return null

  return (
    <button
      type="button"
      onClick={() => handleAdvance()}
      disabled={pending}
      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      style={{ backgroundColor: 'var(--color-teal-light)', color: 'var(--color-teal-deep)' }}
    >
      {next.label}
      {pending ? <Spinner size={12} className="animate-spin" /> : <ArrowRight size={12} />}
    </button>
  )
}
