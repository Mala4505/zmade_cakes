'use client'

import { useRef, useState } from 'react'
import { PhotoThumb, AddPhotoTile } from '@/components/PhotoTile'

export interface ReferenceImage {
  url_original: string
  url_medium: string
  url_thumb: string
}

interface Props {
  images: ReferenceImage[]
  onChange: (images: ReferenceImage[]) => void
  max?: number
}

export default function ReferencePhotoUpload({ images, onChange, max = 6 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const remaining = max - images.length
    const filesToUpload = selected.slice(0, remaining)
    const overflow = selected.length - filesToUpload.length
    const overflowMessage = `Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added`

    if (filesToUpload.length === 0) {
      setError(overflowMessage)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setError(overflow > 0 ? overflowMessage : null)

    // Track the running list locally so each upload's result can be merged in
    // as soon as it resolves, without waiting on (or being blocked by) the others.
    let current = images
    let lastError: string | null = null

    await Promise.all(
      filesToUpload.map(async (file) => {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/upload/order', { method: 'POST', body: fd })
          const json = await res.json()
          if (res.ok) {
            const uploaded: ReferenceImage = {
              url_original: json.url_original,
              url_medium: json.url_medium,
              url_thumb: json.url_thumb,
            }
            current = [...current, uploaded]
            onChange(current)
          } else {
            lastError = json.error ?? 'Upload failed. Please try again.'
          }
        } catch {
          lastError = 'Upload failed. Please check your connection.'
        }
      })
    )

    if (lastError) {
      setError(lastError)
    } else if (overflow > 0) {
      setError(overflowMessage)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <PhotoThumb
            key={img.url_thumb}
            src={img.url_thumb}
            alt={`Reference photo ${i + 1}`}
            removeLabel={`Remove reference photo ${i + 1}`}
            onRemove={() => handleRemove(i)}
          />
        ))}

        {images.length < max && (
          <AddPhotoTile
            onClick={() => fileInputRef.current?.click()}
            uploading={uploading}
            hasPhotos={images.length > 0}
          />
        )}
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
