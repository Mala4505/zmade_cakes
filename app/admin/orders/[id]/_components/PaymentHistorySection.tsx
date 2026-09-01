'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash, Receipt, PencilSimple } from '@phosphor-icons/react'
import RecordPaymentSheet from '@/components/admin/RecordPaymentSheet'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { deletePayment } from '@/lib/actions/payments'
import { formatDate, formatKWD } from '@/lib/utils'
import type { Payment, PaymentMethod } from '@/lib/supabase/types'

interface Props {
  inquiryId: string
  orderId: string | null
  payments: Payment[]
  /** Order total in KWD (3dp). */
  orderTotal: number
  /** Ledger total collected so far. */
  amountPaid: number
  customerName: string
  customerPhone: string
  defaultMethod: PaymentMethod
}

const METHOD_LABEL: Record<Exclude<PaymentMethod, ''>, string> = {
  cash: 'Cash',
  wamd: 'WAMD',
}

export default function PaymentHistorySection({
  inquiryId,
  orderId,
  payments,
  orderTotal,
  amountPaid,
  customerName,
  customerPhone,
  defaultMethod,
}: Props) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { run: runDelete, pending: isPending } = useAsyncAction(
    async (paymentId: string) => {
      try {
        const result = await deletePayment(paymentId)
        if (result.error) return { error: result.error }
      } finally {
        setDeletingId(null)
      }
    },
    {
      successToast: 'Payment deleted',
      onSuccess: () => router.refresh(),
    }
  )

  const handleDelete = (paymentId: string) => {
    if (!confirm('Delete this payment record? This cannot be undone.')) return
    setDeletingId(paymentId)
    runDelete(paymentId)
  }

  const openAdd = () => {
    setEditPayment(null)
    setSheetOpen(true)
  }

  const openEdit = (p: Payment) => {
    setEditPayment(p)
    setSheetOpen(true)
  }

  // The sheet's `amountPaid` is the ledger total BEFORE the payment being
  // recorded/edited — so in edit mode we back this payment's amount out.
  const sheetAmountPaid = editPayment
    ? Math.max(0, amountPaid - Number(editPayment.amount))
    : amountPaid

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
            Payment History
          </p>
          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Paid{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
              {formatKWD(amountPaid.toFixed(3))}
            </span>{' '}
            of{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
              {formatKWD(orderTotal.toFixed(3))}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 text-xs font-semibold shrink-0"
          style={{ color: 'var(--color-teal)' }}
        >
          <Plus size={13} />
          Record Payment
        </button>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          No payments recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {payments.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatKWD(p.amount)}
                  </span>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
                  >
                    {p.method === 'wamd' ? METHOD_LABEL.wamd : METHOD_LABEL.cash}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                    {formatDate(p.paid_at)}
                  </span>
                </div>
                {p.note && (
                  <p className="text-xs italic" style={{ color: 'var(--color-ink-muted)' }}>{p.note}</p>
                )}
                <a
                  href={`/receipt/${p.receipt_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold mt-0.5"
                  style={{ color: 'var(--color-teal)' }}
                >
                  <Receipt size={13} />
                  View receipt
                </a>
              </div>
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  aria-label="Edit payment"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-ink-muted)' }}
                >
                  <PencilSimple size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending && deletingId === p.id}
                  aria-label="Delete payment"
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-60"
                  style={{ color: 'var(--color-ink-muted)' }}
                >
                  <Trash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecordPaymentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        inquiryId={inquiryId}
        orderId={orderId}
        customerName={customerName}
        customerPhone={customerPhone}
        orderTotal={orderTotal}
        amountPaid={sheetAmountPaid}
        defaultMethod={defaultMethod || 'cash'}
        payment={editPayment}
        onSaved={() => {
          setSheetOpen(false)
          setEditPayment(null)
          router.refresh()
        }}
      />
    </div>
  )
}
