'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/supabase/types'

/** Single realtime channel + local cache for the admin session's notification bell/panel.
 *  Seeded from the server-fetched initial list (see app/admin/layout.tsx), then kept live
 *  via Supabase Realtime postgres_changes on INSERT (new notification) and UPDATE (read-state
 *  toggled — including from another tab, which is the whole point of listening for UPDATE too). */
const NotificationContext = createContext<{
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
} | null>(null)

export function NotificationProvider({
  initialNotifications,
  children,
}: {
  initialNotifications: Notification[]
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as Notification
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            return [row, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as Notification
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    const result = await markNotificationRead(id)
    if (result.error) console.error('[NotificationContext] markRead failed:', result.error)
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => (n.is_read ? n : { ...n, is_read: true })))
    const result = await markAllNotificationsRead()
    if (result.error) console.error('[NotificationContext] markAllRead failed:', result.error)
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead }),
    [notifications, unreadCount, markRead, markAllRead]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
