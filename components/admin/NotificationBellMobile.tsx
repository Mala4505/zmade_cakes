'use client'

import { useState } from 'react'
import { Bell } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/Modal'
import { useNotifications } from './NotificationContext'
import { NotificationPanelContent } from './NotificationPanelContent'

/** Bell trigger for AdminMobileTopBar; opens the shared panel content in a full Modal
 *  instead of an anchored dropdown to avoid small-screen clipping. */
export function NotificationBellMobile() {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        className="relative w-8 h-8 flex items-center justify-center rounded-lg ml-auto"
        style={{ color: 'var(--color-ink-muted)' }}
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

      {/* No Modal `title` — NotificationPanelContent renders its own "Notifications" heading
          + "Mark all read" row, so passing a title here would duplicate it. Modal still shows
          its close (X) button bar since hideClose defaults to false. */}
      <Modal open={open} onClose={() => setOpen(false)} size="sm">
        <NotificationPanelContent onNavigate={() => setOpen(false)} />
      </Modal>
    </>
  )
}
