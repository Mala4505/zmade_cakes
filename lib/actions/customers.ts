'use server'

import { createClient } from '@/lib/supabase/server'
import type { Customer, InquiryItem } from '@/lib/supabase/types'
import { normalizePhone } from '@/lib/utils'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export interface CustomerWithHistory {
  customer: Customer
  recentInquiries: Array<{
    id: string
    event_date: string
    status: string
    items: InquiryItem[]
  }>
  totalCount: number
}

export async function lookupCustomerByPhone(phone: string): Promise<ActionResult<CustomerWithHistory | null>> {
  if (!phone || phone.trim().length < 6) return { data: null, error: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone.trim())
    .single()

  if (error || !customer) return { data: null, error: null }

  const { data: inquiries, count } = await supabase
    .from('inquiries')
    .select('id, event_date, status, items:inquiry_items(*)', { count: 'exact' })
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .order('sort_order', { referencedTable: 'inquiry_items' })
    .limit(5)

  return {
    data: {
      customer,
      recentInquiries: inquiries ?? [],
      totalCount: count ?? 0,
    },
    error: null,
  }
}

// Multi-result, partial-match search so the New Inquiry form can surface candidates
// while the admin is still typing a customer's name (lookupCustomerByPhone only ever
// returns one exact phone match, which doesn't help when starting from a name).
export async function searchCustomersByName(
  query: string
): Promise<ActionResult<Pick<Customer, 'id' | 'name' | 'phone' | 'vip'>[]>> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return { data: [], error: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Escape ILIKE wildcards in the user-typed query before interpolating it.
  const escaped = trimmed.replace(/[%_]/g, (c) => `\\${c}`)

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, vip')
    .ilike('name', `%${escaped}%`)
    .order('name')
    .limit(6)

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

export async function upsertCustomer(phone: string, name: string): Promise<ActionResult<Customer>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('customers')
    .upsert(
      { phone: normalizePhone(phone), name: name.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    )
    .select()
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Failed to upsert customer' }
  return { data, error: null }
}

export async function updateCustomerNotes(id: string, notes: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('customers')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}

export async function updateCustomerVip(id: string, vip: boolean): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('customers')
    .update({ vip, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}
