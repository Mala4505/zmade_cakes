'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Customer } from '@/lib/supabase/types'
import { updateCustomerNotes } from '@/lib/actions/customers'

interface CustomerWithHistory {
  customer: Customer
  recentInquiries: Array<{
    id: string
    cake_size: string
    flavor: string
    event_date: string
    status: string
  }>
  totalCount: number
}

interface Props {
  data: CustomerWithHistory
  onPrefill?: (cakeSize: string, flavor: string) => void
}

export function CustomerHistoryPanel({ data, onPrefill }: Props) {
  const { customer, recentInquiries, totalCount } = data
  const [notes, setNotes] = useState(customer.notes ?? '')
  const last = recentInquiries[0]

  async function handleBlur() {
    await updateCustomerNotes(customer.id, notes)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'rounded-xl border p-4 flex flex-col gap-3 mt-2',
          'bg-[var(--color-teal-light)] border-[var(--color-teal)]'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-ink)]">{customer.name}</span>
              {customer.vip && (
                <span
                  className={cn(
                    'text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                    'bg-amber-100 text-amber-700'
                  )}
                >
                  VIP
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {totalCount} previous order{totalCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {last && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-secondary)]">
            <span className="text-[var(--color-ink-muted)]">Last cake:</span>
            <span>{last.cake_size} · {last.flavor}</span>
          </div>
        )}

        {onPrefill && last && (
          <button
            type="button"
            onClick={() => onPrefill(last.cake_size, last.flavor)}
            className={cn(
              'self-start text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              'border-[var(--color-teal)] text-[var(--color-teal)]',
              'hover:bg-[var(--color-teal)] hover:text-white'
            )}
          >
            Pre-fill from last order
          </button>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--color-ink-muted)]">Notes (internal)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleBlur}
            className={cn(
              'w-full resize-none rounded-lg border px-3 py-2 text-xs',
              'bg-[var(--color-surface)] border-[var(--color-border)]',
              'text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]'
            )}
            placeholder="Add internal notes about this customer…"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
