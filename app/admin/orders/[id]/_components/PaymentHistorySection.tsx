'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash, Receipt } from '@phosphor-icons/react'
import { Modal, Button, Field, Input, Select } from '@/components/ui'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { recordPayment, deletePayment } from '@/lib/actions/payments'
import { formatDate, formatKWD } from '@/lib/utils'
import type { Payment, PaymentMethod } from '@/lib/supabase/types'

interface Props {
  orderId: string
  payments: Payment[]
  defaultMethod: PaymentMethod
}

const METHOD_LABEL: Record<Exclude<PaymentMethod, ''>, string> = {
  cash: 'Cash',
  wamd: 'WAMD',
}

export default function PaymentHistorySection({ orderId, payments, defaultMethod }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
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

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          Payment History
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 text-xs font-semibold"
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
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
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
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                disabled={isPending && deletingId === p.id}
                aria-label="Delete payment"
                className="p-1.5 -m-1.5 rounded-lg shrink-0 transition-colors disabled:opacity-60"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                <Trash size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <RecordPaymentModal
        orderId={orderId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMethod={defaultMethod || 'cash'}
        onSaved={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function RecordPaymentModal({
  orderId,
  open,
  onClose,
  defaultMethod,
  onSaved,
}: {
  orderId: string
  open: boolean
  onClose: () => void
  defaultMethod: PaymentMethod
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod || 'cash')
  const [note, setNote] = useState('')

  const reset = () => {
    setAmount('')
    setMethod(defaultMethod || 'cash')
    setNote('')
  }

  const { run: runSubmit, pending: isPending, error } = useAsyncAction(
    async () => {
      const parsedAmount = Number(amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return { error: 'Enter an amount greater than zero' }
      }
      const result = await recordPayment(orderId, {
        amount: parsedAmount,
        method: method === 'wamd' ? 'wamd' : 'cash',
        note: note.trim() || undefined,
      })
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'Payment recorded',
      errorToast: false,
      onSuccess: () => {
        reset()
        onSaved()
      },
    }
  )

  const handleClose = () => {
    if (isPending) return
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Record Payment"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => runSubmit()} loading={isPending}>
            Save Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Amount (KD)" required>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.000"
            prefix="KD"
          />
        </Field>
        <Field label="Method" required>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="wamd">WAMD</option>
          </Select>
        </Field>
        <Field label="Note (optional)">
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Deposit at pickup"
          />
        </Field>
        {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      </div>
    </Modal>
  )
}
