'use server'
import { createClient } from '@/lib/supabase/server'
import type { BlackoutDate, BusinessSetting, BusinessSettingKey } from '@/lib/supabase/types'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function getSettings(keys: BusinessSettingKey[]): Promise<ActionResult<Record<BusinessSettingKey, unknown>>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('business_settings')
    .select('key, value')
    .in('key', keys)

  if (error) return { data: null, error: error.message }

  const result = {} as Record<BusinessSettingKey, unknown>
  data?.forEach((row) => { result[row.key as BusinessSettingKey] = row.value })
  return { data: result, error: null }
}

export async function updateSetting(key: BusinessSettingKey, value: unknown): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('business_settings')
    .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}

export async function getBlackouts(): Promise<ActionResult<BlackoutDate[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('blackout_dates')
    .select('*')
    .order('date_from', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

export async function createBlackout(
  input: { date_from: string; date_to: string; reason: string }
): Promise<ActionResult<BlackoutDate>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('blackout_dates')
    .insert(input)
    .select()
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Failed to create blackout' }
  return { data, error: null }
}

export async function deleteBlackout(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase.from('blackout_dates').delete().eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}
