'use server'
import { createClient } from '@/lib/supabase/server'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function markNotificationRead(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}
