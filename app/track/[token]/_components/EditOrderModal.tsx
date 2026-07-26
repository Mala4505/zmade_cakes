'use client'

import { useState } from 'react'
import { PencilSimple, WhatsappLogo } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { whatsappUrl } from '@/lib/whatsapp'

interface EditOrderModalProps {
  businessPhone: string
  cakeSummary: string
  eventDate: string
}

/**
 * Trigger + confirmation modal for editing an order from the customer
 * tracking page. Clicking "Edit" no longer jumps straight to WhatsApp —
 * it explains what's about to happen first.
 */
export function EditOrderModal({ businessPhone, cakeSummary, eventDate }: EditOrderModalProps) {
  const [open, setOpen] = useState(false)

  const href = whatsappUrl(
    businessPhone,
    `Hi, I'd like to update my order (${cakeSummary}, ${eventDate})`
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium shrink-0 min-h-11 px-2 -mx-2 -my-2"
        style={{ color: 'var(--color-teal)' }}
      >
        <PencilSimple size={13} weight="bold" />
        Edit
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit your order"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
            >
              Cancel
            </button>
            <Button
              href={href}
              onClick={() => setOpen(false)}
              variant="primary"
              size="md"
              className="px-5"
            >
              <WhatsappLogo size={16} weight="fill" />
              Continue to WhatsApp
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
          This opens WhatsApp so you can message us directly about changing your order. We'll take it from there.
        </p>
        <p className="text-sm mt-3" style={{ color: 'var(--color-ink-muted)' }}>
          Editing: <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{cakeSummary}</span>, {eventDate}
        </p>
      </Modal>
    </>
  )
}
