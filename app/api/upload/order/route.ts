import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'

// Public reference-photo upload for the /order form, taken before an inquiry
// exists. Files land in storage immediately; the returned URLs are submitted
// alongside the inquiry and turned into inquiry_images rows once it's created
// (see /api/inquiries).
const BUCKET = 'cake-references'
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or HEIC.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Maximum is ${MAX_SIZE_MB}MB.` }, { status: 400 })
    }

    const supabase = createServiceClient()

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

    return NextResponse.json({
      url_original: publicUrl(`${base}/original.jpg`),
      url_medium: publicUrl(`${base}/medium.jpg`),
      url_thumb: publicUrl(`${base}/thumb.jpg`),
    })
  } catch (err) {
    console.error('Order upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
