'use client'

import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowSquareOut, CheckCircle } from '@phosphor-icons/react'
import { Modal, Button, Field, Input, Select } from '@/components/ui'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { recordPayment, updatePayment } from '@/lib/actions/payments'
import { formatKWD } from '@/lib/utils'
import { EASE_OUT_QUART } from '@/lib/motion'
import type { Payment, PaymentMethod } from '@/lib/supabase/types'

export interface RecordPaymentSheetProps {
  open: boolean
  onClose: () => void
  inquiryId: string
  orderId: string | null
  customerName: string
  customerPhone: string
  orderTotal: number // KWD, 3dp
  amountPaid: number // KWD, current ledger total BEFORE this payment
  defaultMethod: PaymentMethod
  payment?: Payment | null // when set -> EDIT mode (calls updatePayment), prefill fields
  onSaved?: (payment: Payment) => void // caller does router.refresh() here
}

type Method = 'cash' | 'wamd'

const EPSILON = 0.0005

function coerceMethod(value: PaymentMethod | undefined | null): Method {
  return value === 'wamd' ? 'wamd' : 'cash'
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function kwd(n: number): string {
  return formatKWD(Math.max(0, n).toFixed(3))
}

export default function RecordPaymentSheet({
  open,
  onClose,
  inquiryId,
  orderId,
  customerName,
  customerPhone,
  orderTotal,
  amountPaid,
  defaultMethod,
  payment = null,
  onSaved,
}: RecordPaymentSheetProps): JSX.Element {
  const reduceMotion = useReducedMotion()
  const isEdit = payment != null

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Method>(coerceMethod(defaultMethod))
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saved, setSaved] = useState<Payment | null>(null)

  // (Re)initialise every time the sheet opens. Deliberately keyed on `open` only:
  // prop drift while the sheet is closed shouldn't stomp a half-typed amount.
  useEffect(() => {
    if (!open) return
    if (payment) {
      setAmount(String(payment.amount))
      setMethod(coerceMethod(payment.method))
      setNote(payment.note ?? '')
      setDate(payment.paid_at.slice(0, 10))
    } else {
      setAmount('')
      setMethod(coerceMethod(defaultMethod))
      setNote('')
      setDate(todayISO())
    }
    setSaved(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const balanceBefore = Math.max(0, orderTotal - amountPaid)
  const enteredAmount = Number(amount)
  const enteredValid = Number.isFinite(enteredAmount) && enteredAmount > 0
  const projectedPaid = amountPaid + (enteredValid ? enteredAmount : 0)
  const projectedBalance = Math.max(0, orderTotal - projectedPaid)
  const overpaying = enteredValid && projectedPaid > orderTotal + EPSILON

  // The saved row is stashed here from inside the action, then consumed in
  // `onSuccess` — which the hook runs only after `pending` has cleared, so the
  // caller's router.refresh() never keeps the Save button spinning.
  const resultRef = useRef<Payment | null>(null)

  const { run, pending, error } = useAsyncAction(
    async () => {
      if (!enteredValid) {
        return { error: 'Enter an amount greater than zero' }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: 'Choose a valid payment date' }
      }

      const res = payment
        ? await updatePayment(payment.id, {
            amount: enteredAmount,
            method,
            note: note.trim() || null,
            paid_at: date,
          })
        : await recordPayment(inquiryId, {
            amount: enteredAmount,
            method,
            note: note.trim() || undefined,
            paid_at: date,
            orderId,
          })

      if (res.error) return { error: res.error }
      resultRef.current = res.data
    },
    {
      successToast: isEdit ? 'Payment updated' : 'Payment recorded',
      errorToast: false,
      onSuccess: () => {
        const row = resultRef.current
        resultRef.current = null
        if (!row) return
        onSaved?.(row)
        // Edit mode has no confirmation step — close straight away. A fresh
        // record swaps the body to the success view; `onClose` fires on Done.
        if (isEdit) onClose()
        else setSaved(row)
      },
    }
  )

  function handleClose() {
    if (pending) return
    onClose()
  }

  const paidAfter = saved ? amountPaid + Number(saved.amount) : projectedPaid
  const balanceAfter = Math.max(0, orderTotal - paidAfter)
  const showSuccess = saved != null && !isEdit

  const contextRows = useMemo(
    () => [
      { label: 'Order total', value: kwd(orderTotal) },
      { label: 'Paid so far', value: kwd(amountPaid) },
    ],
    [orderTotal, amountPaid]
  )

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={showSuccess ? 'Payment recorded' : isEdit ? 'Edit payment' : 'Record payment'}
      size="sm"
      footer={
        showSuccess ? (
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => run()} loading={pending}>
              {isEdit ? 'Save changes' : 'Save payment'}
            </Button>
          </>
        )
      }
    >
      {showSuccess && saved ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT_QUART }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle size={22} weight="fill" style={{ color: 'var(--color-teal)' }} className="shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                {kwd(Number(saved.amount))} from {customerName}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                {balanceAfter <= EPSILON
                  ? 'This order is now fully paid.'
                  : `Balance remaining: ${kwd(balanceAfter)}`}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg border px-3.5 py-3 flex flex-col gap-1.5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-ink-muted)' }}>Paid to date</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                {kwd(paidAfter)}
              </span>
            </div>
            <div
              className="pt-1.5 mt-0.5 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Balance
              </span>
              <span className="text-base font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                {kwd(balanceAfter)}
              </span>
            </div>
          </div>

          <a
            href={`/receipt/${saved.receipt_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: 'var(--color-teal)' }}
          >
            <ArrowSquareOut size={15} />
            View receipt
          </a>

          {/* Phase 3: Send receipt / Send link only / Copy link buttons go here */}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Context header — mirrors the read-only strip on InquiryDetailForm */}
          <div
            className="rounded-lg border px-3.5 py-3 flex flex-col gap-1.5"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-raised)' }}
          >
            {contextRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--color-ink-muted)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-secondary)' }}>
                  {row.value}
                </span>
              </div>
            ))}
            <div
              className="pt-1.5 mt-0.5 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>
                Balance
              </span>
              <span
                className="text-base font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}
              >
                {kwd(balanceBefore)}
              </span>
            </div>
          </div>

          <Field label="Amount" required>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                prefix="KD"
                autoFocus={!isEdit}
              />
              {balanceBefore > EPSILON && (
                <button
                  type="button"
                  onClick={() => setAmount(balanceBefore.toFixed(3))}
                  className="self-start rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-teal)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Pay full balance · {kwd(balanceBefore)}
                </button>
              )}
              {overpaying && (
                <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                  This is {kwd(projectedPaid - orderTotal)} more than the order total. Save anyway if it
                  covers a tip or rounding.
                </p>
              )}
              {enteredValid && !overpaying && (
                <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                  Balance after this payment: {kwd(projectedBalance)}
                </p>
              )}
            </div>
          </Field>

          <Field label="Method" required>
            <Select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              <option value="cash">Cash</option>
              <option value="wamd">WAMD</option>
            </Select>
          </Field>

          <Field label="Date paid" required>
            <Input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field label="Note (optional)">
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Deposit at pickup"
            />
          </Field>

          <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            Recording for {customerName} · {customerPhone}
          </p>

          {error && (
            <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
