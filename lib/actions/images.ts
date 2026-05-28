'use server'

import { createClient } from '@/lib/supabase/server'
import type { InquiryImage } from '@/lib/supabase/types'

type ActionResult<T> = { data: T; error: null } | { data: null; error: string }

export async function getInquiryImages(inquiry_id: string): Promise<ActionResult<InquiryImage[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('inquiry_images')
    .select('*')
    .eq('inquiry_id', inquiry_id)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

export async function deleteInquiryImage(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: img, error: fetchError } = await supabase
    .from('inquiry_images')
    .select('url_original, url_medium, url_thumb')
    .eq('id', id)
    .single()

  if (fetchError || !img) return { data: null, error: 'Image not found' }

  const { error: deleteError } = await supabase
    .from('inquiry_images')
    .delete()
    .eq('id', id)

  if (deleteError) return { data: null, error: deleteError.message }

  try {
    const bucket = 'cake-references'
    const extractPath = (url: string) => url.split(`/${bucket}/`)[1] ?? ''
    const paths = [img.url_original, img.url_medium, img.url_thumb].map(extractPath).filter(Boolean)
    if (paths.length > 0) {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const svc = createServiceClient()
      await svc.storage.from(bucket).remove(paths)
    }
  } catch { /* ignore */ }

  return { data: undefined, error: null }
}
