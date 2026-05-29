'use server'

import { createClient } from '@/lib/supabase/server'
import type { FlavorWithPrices, FlavorSizePrice } from '@/lib/supabase/types'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function getFlavorsWithPrices(): Promise<FlavorWithPrices[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('flavor_options')
    .select('*, prices:flavor_size_prices(*)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return (data as FlavorWithPrices[] | null) ?? []
}

// Full replace: deletes all prices for this flavor then inserts the new set.
export async function upsertFlavorPrices(
  flavorId: string,
  prices: { sizeId: string; price: number }[]
): Promise<ActionResult<FlavorSizePrice[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error: delErr } = await supabase
    .from('flavor_size_prices')
    .delete()
    .eq('flavor_id', flavorId)
  if (delErr) return { data: null, error: delErr.message }

  if (prices.length === 0) return { data: [], error: null }

  const { data, error } = await supabase
    .from('flavor_size_prices')
    .insert(prices.map((p) => ({ flavor_id: flavorId, size_id: p.sizeId, price: p.price })))
    .select()
  if (error) return { data: null, error: error.message }
  return { data: (data as FlavorSizePrice[]) ?? [], error: null }
}

// Uploads file to flavor-images bucket and updates flavor_options.image_url.
export async function uploadFlavorImage(
  flavorId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const file = formData.get('file') as File | null
  if (!file) return { data: null, error: 'No file provided' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${flavorId}/${Date.now()}.${ext}`
  const bucket = 'flavor-images'

  const { createServiceClient } = await import('@/lib/supabase/server')
  const svc = createServiceClient()

  const { error: uploadErr } = await svc.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadErr) return { data: null, error: uploadErr.message }

  const {
    data: { publicUrl },
  } = svc.storage.from(bucket).getPublicUrl(path)

  const { error: updateErr } = await supabase
    .from('flavor_options')
    .update({ image_url: publicUrl })
    .eq('id', flavorId)
  if (updateErr) return { data: null, error: updateErr.message }

  return { data: { url: publicUrl }, error: null }
}

export async function removeFlavorImage(flavorId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('flavor_options')
    .update({ image_url: null })
    .eq('id', flavorId)
  if (error) return { data: null, error: error.message }
  return { data: undefined, error: null }
}
