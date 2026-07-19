'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Header slot. When set, a header bar with a close button is rendered. */
  title?: React.ReactNode
  /** Footer slot (e.g. action buttons), separated by a hairline border. */
  footer?: React.ReactNode
  size?: keyof typeof SIZE_CLASSES
  /** Hide the header close button (ESC / backdrop still close). */
  hideClose?: boolean
  className?: string
  children: React.ReactNode
}

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1]

/**
 * Portal-rendered modal with the system's single floating shadow.
 * Closes on ESC and backdrop click; respects prefers-reduced-motion.
 */
export function Modal({
  open,
  onClose,
  title,
  footer,
  size = 'md',
  hideClose = false,
  className,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => setMounted(true), [])

  // ESC to close + focus management + body scroll lock.
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        // Minimal focus trap: keep Tab cycling inside the panel.
        const panel = panelRef.current
        if (!panel) return
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(25,22,20,0.45)]"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            animate={
              reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE_OUT_QUART }}
            className={cn(
              'flex w-full flex-col max-h-[85svh] rounded-xl border outline-none',
              'bg-[var(--color-cream)] border-[var(--color-border)] shadow-[var(--shadow-floating)]',
              SIZE_CLASSES[size],
              className
            )}
          >
            {(title || !hideClose) && (
              <div
                className="flex items-start justify-between gap-4 px-5 py-4 border-b shrink-0 border-[var(--color-border)]"
              >
                <h2 className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
                  {title}
                </h2>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1.5 -m-1.5 rounded-lg transition-colors text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink-secondary)]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 border-[var(--color-border)]">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
