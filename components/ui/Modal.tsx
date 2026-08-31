'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { EASE_OUT_QUART } from '@/lib/motion'

// Unprefixed: mobile bottom sheet is always full-width. The max-width only
// kicks in at sm: and up, once the panel becomes a centered dialog.
const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
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
  // sm: and up renders a centered dialog; below sm: a bottom sheet. Lazy-initialized
  // from matchMedia so a desktop viewport doesn't flash the mobile sheet animation
  // on the first render before the effect below can correct it.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  // Drag-to-dismiss on the mobile sheet's handle. dragListener is off on the
  // panel itself so only the handle (via onPointerDown -> dragControls.start)
  // can initiate a drag — scrolling the body content and tapping buttons stay
  // untouched by the gesture.
  const dragControls = useDragControls()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    setIsDesktop(mql.matches)
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

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

  // Below sm:, the panel is a bottom sheet that slides up from off-screen.
  // At sm: and up it's the original centered-dialog fade + scale.
  const panelInitial = reduceMotion
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { opacity: 1, y: '100%' }
  const panelAnimate = reduceMotion
    ? { opacity: 1 }
    : isDesktop
      ? { opacity: 1, scale: 1, y: 0 }
      : { opacity: 1, y: 0 }
  const panelExit = reduceMotion
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { opacity: 1, y: '100%' }

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
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-[rgba(25,22,20,0.45)]"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT_QUART }}
            drag={!isDesktop && !reduceMotion ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose()
            }}
            className={cn(
              'flex w-full max-w-none flex-col max-h-[85svh] rounded-t-xl border outline-none',
              'sm:rounded-xl',
              'bg-[var(--color-cream)] border-[var(--color-border)] shadow-[var(--shadow-floating)]',
              SIZE_CLASSES[size],
              className
            )}
          >
            {/* Drag handle: swipe down to dismiss the mobile bottom sheet.
                touch-action: none stops the browser's own scroll gesture from
                competing with the drag on touch devices. */}
            <div
              onPointerDown={(e) => {
                if (!isDesktop && !reduceMotion) dragControls.start(e)
              }}
              className="flex justify-center pt-2.5 pb-1 shrink-0 sm:hidden cursor-grab touch-none active:cursor-grabbing"
              aria-hidden="true"
            >
              <div className="h-1 w-9 rounded-full bg-[var(--color-border-strong)]" />
            </div>

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
                    className="min-h-11 min-w-11 -m-2 flex items-center justify-center rounded-lg transition-colors text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-ink-secondary)]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div
                className={cn(
                  'flex flex-col-reverse items-stretch gap-2 px-5 py-4 border-t shrink-0 border-[var(--color-border)]',
                  'sm:flex-row sm:items-center sm:justify-end',
                  '[&>*]:w-full sm:[&>*]:w-auto'
                )}
              >
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
