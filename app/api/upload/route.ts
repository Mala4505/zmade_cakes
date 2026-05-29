import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import sharp from 'sharp'

const BUCKET = 'cake-references'
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or HEIC.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}`

  const [originalBuf, mediumBuf, thumbBuf] = await Promise.all([
    sharp(buffer).jpeg({ quality: 90 }).toBuffer(),
    sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
    sharp(buffer).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
  ])

  const service = createServiceClient()

  const uploads = await Promise.all([
    service.storage.from(BUCKET).upload(`${base}/original.jpg`, originalBuf, { contentType: 'image/jpeg', upsert: false }),
    service.storage.from(BUCKET).upload(`${base}/medium.jpg`, mediumBuf, { contentType: 'image/jpeg', upsert: false }),
    service.storage.from(BUCKET).upload(`${base}/thumb.jpg`, thumbBuf, { contentType: 'image/jpeg', upsert: false }),
  ])

  const errors = uploads.filter((u) => u.error)
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  function publicUrl(path: string) {
    const { data } = service.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const originalUrl = publicUrl(`${base}/original.jpg`)
  const mediumUrl = publicUrl(`${base}/medium.jpg`)
  const thumbUrl = publicUrl(`${base}/thumb.jpg`)

  // If inquiry_id is provided, save a record to inquiry_images
  const inquiryId = formData.get('inquiry_id') as string | null
  const imageType = formData.get('image_type') as string | null
  if (inquiryId) {
    const { error: dbError } = await service
      .from('inquiry_images')
      .insert({
        inquiry_id: inquiryId,
        uploaded_by: 'admin',
        image_type: imageType === 'finished' ? 'finished' : 'reference',
        url_original: originalUrl,
        url_medium: mediumUrl,
        url_thumb: thumbUrl,
        caption: '',
      })
    if (dbError) {
      await Promise.allSettled([
        service.storage.from(BUCKET).remove([`${base}/original.jpg`, `${base}/medium.jpg`, `${base}/thumb.jpg`])
      ])
      return NextResponse.json({ error: 'Failed to save image record' }, { status: 500 })
    }
  }

  return NextResponse.json({
    original: originalUrl,
    medium: mediumUrl,
    thumb: thumbUrl,
  })
}
