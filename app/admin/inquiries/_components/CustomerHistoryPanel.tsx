'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn, orderSummary } from '@/lib/utils'
import type { Customer, InquiryItem } from '@/lib/supabase/types'
import { updateCustomerNotes } from '@/lib/actions/customers'
import { toast } from 'sonner'

interface CustomerWithHistory {
  customer: Customer
  recentInquiries: Array<{
    id: string
    event_date: string
    status: string
    items: InquiryItem[]
  }>
  totalCount: number
}

export type MatchState = 'pending' | 'selected' | 'new'

// The item shape the prefill button hands back to the form's `replace()` call (see
// InquiryForm.tsx). Deliberately just the content fields a form item needs — not the full
// InquiryItem row (id/inquiry_id/sort_order/created_at), since a form item has no db identity
// of its own until it's saved.
export interface PrefillItem {
  order_type: 'cake' | 'other_item'
  item_name: string
  cake_size: string
  flavor: string
  occasion: string
  theme: string
  message_on_cake: string
  quantity: number
  special_requirements: string
}

interface Props {
  data: CustomerWithHistory
  onPrefill?: (items: PrefillItem[]) => void
  matchState: MatchState
  onUseExisting: () => void
  onNewCustomer: () => void
}

// Shared with the "Repeat this order" entry points (order detail page, customer profile —
// see Phase 5 of the payment-ledger plan): converts DB item rows into the shape
// InquiryForm's `replace()` / `prefillFrom` prop expects. Kept here since it's the same
// mapping this panel's own prefill button already needed.
export function toPrefillItems(items: InquiryItem[]): PrefillItem[] {
  return items.map((item) => ({
    order_type: item.order_type,
    item_name: item.item_name,
    cake_size: item.cake_size,
    flavor: item.flavor,
    occasion: item.occasion,
    theme: item.theme,
    message_on_cake: item.message_on_cake,
    quantity: item.quantity,
    special_requirements: item.special_requirements,
  }))
}

export function CustomerHistoryPanel({ data, onPrefill, matchState, onUseExisting, onNewCustomer }: Props) {
  const { customer, recentInquiries, totalCount } = data
  const [notes, setNotes] = useState(customer.notes ?? '')
  const last = recentInquiries[0]
  const lastIsCake = !last || last.items.some((item) => item.order_type !== 'other_item')

  const prefillItems: PrefillItem[] = toPrefillItems(last?.items ?? [])

  async function handleBlur() {
    const result = await updateCustomerNotes(customer.id, notes)
    if (result.error) toast.error(result.error)
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
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--color-teal)]/30">
          {matchState === 'pending' && (
            <>
              <span className="text-xs text-[var(--color-ink-secondary)]">
                Existing customer found: <span className="font-bold text-[var(--color-ink)]">{customer.name}</span>
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onUseExisting}
                  className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-[var(--color-teal)] text-white transition-colors hover:opacity-90"
                >
                  Use this customer
                </button>
                <button
                  type="button"
                  onClick={onNewCustomer}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium border border-[var(--color-border)] text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-surface)]"
                >
                  This is someone else
                </button>
              </div>
            </>
          )}
          {matchState === 'selected' && (
            <>
              <span className="text-xs text-[var(--color-ink-secondary)]">
                Linked to <span className="font-bold text-[var(--color-ink)]">{customer.name}</span>
              </span>
              <button
                type="button"
                onClick={onNewCustomer}
                className="text-xs font-medium text-[var(--color-teal-deep)] underline underline-offset-2 shrink-0"
              >
                Not them? Use new customer
              </button>
            </>
          )}
          {matchState === 'new' && (
            <>
              <span className="text-xs text-[var(--color-ink-secondary)]">New customer</span>
              <button
                type="button"
                onClick={onUseExisting}
                className="text-xs font-medium text-[var(--color-teal-deep)] underline underline-offset-2 shrink-0"
              >
                Actually, use this customer
              </button>
            </>
          )}
        </div>

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
            <span className="text-[var(--color-ink-muted)]">Last order:</span>
            <span>{orderSummary(last.items)}</span>
          </div>
        )}

        {onPrefill && last && lastIsCake && prefillItems.length > 0 && (
          <button
            type="button"
            onClick={() => onPrefill(prefillItems)}
            className={cn(
              'self-start text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              'border-[var(--color-teal)] text-[var(--color-teal)]',
              'hover:bg-[var(--color-teal)] hover:text-white'
            )}
          >
            {`Pre-fill ${prefillItems.length} item${prefillItems.length === 1 ? '' : 's'} from last order`}
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
