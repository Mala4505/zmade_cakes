'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell } from '@phosphor-icons/react'
import { useNotifications } from './NotificationContext'
import { NotificationPanelContent } from './NotificationPanelContent'
import { EASE_OUT_QUART } from '@/lib/motion'

/** Bell trigger + anchored dropdown panel for AdminSidebar's header row. */
export function NotificationBellDesktop() {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="hidden md:block fixed top-4 right-4 z-40" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg border transition-colors hover:bg-[var(--color-surface-raised)]"
        style={{
          color: 'var(--color-ink-muted)',
          backgroundColor: 'var(--color-cream)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <Bell size={18} weight={unreadCount > 0 ? 'fill' : 'regular'} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border z-50 p-3 origin-top-right"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <NotificationPanelContent onNavigate={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
