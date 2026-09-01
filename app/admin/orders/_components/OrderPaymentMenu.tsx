'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DotsThreeVertical, Wallet } from '@phosphor-icons/react'
import RecordPaymentSheet from '@/components/admin/RecordPaymentSheet'
import { IconButton } from '@/components/ui'
import type { PaymentMethod, WhatsAppTemplates } from '@/lib/supabase/types'

export interface OrderPaymentMenuProps {
  inquiryId: string
  orderId: string | null
  customerName: string
  customerPhone: string
  /** Order total in KWD (3dp). */
  orderTotal: number
  /** Ledger total collected so far, before any new payment. */
  amountPaid: number
  defaultMethod: PaymentMethod
  templates?: WhatsAppTemplates
}

/**
 * The compact "a partial just came in" entry point: a `⋯` button on an order
 * row that opens a one-item menu into the shared RecordPaymentSheet. Rendered as
 * a sibling of any stretched-link card overlay, so it needs `relative z-10` from
 * the parent to stay tappable.
 */
export default function OrderPaymentMenu({
  inquiryId,
  orderId,
  customerName,
  customerPhone,
  orderTotal,
  amountPaid,
  defaultMethod,
  templates,
}: OrderPaymentMenuProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      setShown(false)
      return
    }
    const raf = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const stop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <IconButton
          tone="muted"
          aria-label="Order actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            stop(e)
            setMenuOpen((v) => !v)
          }}
        >
          <DotsThreeVertical size={18} weight="bold" />
        </IconButton>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="fixed inset-0 z-40 cursor-default"
              onClick={(e) => {
                stop(e)
                setMenuOpen(false)
              }}
            />
            <div
              role="menu"
              className={`absolute right-0 top-full z-50 mt-1 min-w-[11rem] origin-top-right overflow-hidden rounded-lg border transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
                shown ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
              }`}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-floating)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  stop(e)
                  setMenuOpen(false)
                  setSheetOpen(true)
                }}
                className="flex w-full min-h-11 items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-[var(--color-surface-raised)]"
                style={{ color: 'var(--color-ink-secondary)' }}
              >
                <Wallet size={16} />
                Record payment
              </button>
            </div>
          </>
        )}
      </div>

      <RecordPaymentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        inquiryId={inquiryId}
        orderId={orderId}
        customerName={customerName}
        customerPhone={customerPhone}
        orderTotal={orderTotal}
        amountPaid={amountPaid}
        defaultMethod={defaultMethod || 'cash'}
        templates={templates}
        onSaved={() => {
          setSheetOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
