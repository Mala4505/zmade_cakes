'use server'

import { createClient } from '@/lib/supabase/server'
import { optionSchema, OPTION_TABLES, type OptionTable } from '@/lib/validations/options'
import { tokenSchema } from '@/lib/validations/inquiry'
import type { OptionRow } from '@/lib/supabase/types'

type FieldErrors = Record<string, string[]>
type ActionResult<T> =
  | { data: T; error: null; fieldErrors: null }
  | { data: null; error: string; fieldErrors: null }
  | { data: null; error: null; fieldErrors: FieldErrors }

function isValidTable(t: string): t is OptionTable {
  return (OPTION_TABLES as readonly string[]).includes(t)
}

// Fetch active options only — used for public inquiry form dropdowns
export async function getOptions(type: OptionTable): Promise<ActionResult<OptionRow[]>> {
  if (!isValidTable(type)) return { data: null, error: 'Invalid option type', fieldErrors: null }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from(type)
    .select()
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: (data as OptionRow[]) ?? [], error: null, fieldErrors: null }
}

// Fetch all options including inactive — used for admin Options Manager
export async function getAllOptions(type: OptionTable): Promise<ActionResult<OptionRow[]>> {
  if (!isValidTable(type)) return { data: null, error: 'Invalid option type', fieldErrors: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { data, error } = await supabase
    .from(type)
    .select()
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: (data as OptionRow[]) ?? [], error: null, fieldErrors: null }
}

export async function createOption(
  type: OptionTable,
  rawData: unknown
): Promise<ActionResult<OptionRow>> {
  if (!isValidTable(type)) return { data: null, error: 'Invalid option type', fieldErrors: null }

  const parsed = optionSchema.safeParse(rawData)
  if (!parsed.success) {
    return { data: null, error: null, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { data, error } = await supabase
    .from(type)
    .insert(parsed.data as never)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to create option', fieldErrors: null }
  }
  return { data: data as OptionRow, error: null, fieldErrors: null }
}

export async function updateOption(
  id: string,
  type: OptionTable,
  rawData: unknown
): Promise<ActionResult<OptionRow>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid option ID', fieldErrors: null }
  }
  if (!isValidTable(type)) return { data: null, error: 'Invalid option type', fieldErrors: null }

  const parsed = optionSchema.partial().safeParse(rawData)
  if (!parsed.success) {
    return { data: null, error: null, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { data, error } = await supabase
    .from(type)
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to update option', fieldErrors: null }
  }
  return { data: data as OptionRow, error: null, fieldErrors: null }
}

// Soft delete: sets is_active = false so existing inquiries that reference this value aren't broken
export async function deleteOption(id: string, type: OptionTable): Promise<ActionResult<void>> {
  if (!tokenSchema.safeParse(id).success) {
    return { data: null, error: 'Invalid option ID', fieldErrors: null }
  }
  if (!isValidTable(type)) return { data: null, error: 'Invalid option type', fieldErrors: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized', fieldErrors: null }

  const { error } = await supabase.from(type).update({ is_active: false } as never).eq('id', id)

  if (error) return { data: null, error: error.message, fieldErrors: null }
  return { data: undefined, error: null, fieldErrors: null }
}
