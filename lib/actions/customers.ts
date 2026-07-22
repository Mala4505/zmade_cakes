'use server'

import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/lib/supabase/types'
import { normalizePhone } from '@/lib/utils'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

interface CustomerWithHistory {
  customer: Customer
  recentInquiries: Array<{
    id: string
    cake_size: string
    flavor: string
    event_date: string
    status: string
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
    .select('id, cake_size, flavor, event_date, status', { count: 'exact' })
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
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
