import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'cake-references'
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const token = formData.get('confirmation_token') as string | null

    if (!file || !token) {
      return NextResponse.json({ error: 'Missing file or token' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or HEIC.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Maximum is ${MAX_SIZE_MB}MB.` }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: inquiry, error: tokenError } = await supabase
      .from('inquiries')
      .select('id')
      .eq('confirmation_token', token)
      .single()

    if (tokenError || !inquiry) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}`

    const [originalBuf, mediumBuf, thumbBuf] = await Promise.all([
      sharp(buffer).jpeg({ quality: 90 }).toBuffer(),
      sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
      sharp(buffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
    ])

    const uploads = await Promise.all([
      supabase.storage.from(BUCKET).upload(`${base}/original.jpg`, originalBuf, { contentType: 'image/jpeg', upsert: false }),
      supabase.storage.from(BUCKET).upload(`${base}/medium.jpg`, mediumBuf, { contentType: 'image/jpeg', upsert: false }),
      supabase.storage.from(BUCKET).upload(`${base}/thumb.jpg`, thumbBuf, { contentType: 'image/jpeg', upsert: false }),
    ])

    const errors = uploads.filter(u => u.error)
    if (errors.length > 0) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    function publicUrl(path: string) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return data.publicUrl
    }

    const url_original = publicUrl(`${base}/original.jpg`)
    const url_medium = publicUrl(`${base}/medium.jpg`)
    const url_thumb = publicUrl(`${base}/thumb.jpg`)

    const { error: insertError } = await supabase.from('inquiry_images').insert({
      inquiry_id: inquiry.id,
      uploaded_by: 'customer',
      image_type: 'reference',
      url_original,
      url_medium,
      url_thumb,
      caption: '',
    })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ original: url_original, medium: url_medium, thumb: url_thumb })
  } catch (err) {
    console.error('Public upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
