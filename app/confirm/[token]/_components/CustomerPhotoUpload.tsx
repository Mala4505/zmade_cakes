'use client'

import { useState, useRef } from 'react'
import { PhotoThumb, AddPhotoTile } from '@/components/PhotoTile'

interface Props {
  token: string
}

interface UploadedPhoto {
  id: string
  thumb: string
}

const MAX_PHOTOS = 6

export default function CustomerPhotoUpload({ token }: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadOne = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('confirmation_token', token)
    const res = await fetch('/api/upload/public', { method: 'POST', body: fd })
    if (res.ok) {
      const json = await res.json()
      if (json.id && json.thumb) {
        setPhotos((prev) => [...prev, { id: json.id, thumb: json.thumb }])
      }
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Upload failed. Please try again.')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    const toUpload = files.slice(0, remaining)
    if (files.length > remaining) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`)
    } else {
      setError(null)
    }

    setUploading(true)
    try {
      for (const file of toUpload) {
        await uploadOne(file)
      }
    } catch {
      setError('Upload failed. Please check your connection.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (photo: UploadedPhoto) => {
    setRemovingId(photo.id)
    setError(null)
    try {
      const res = await fetch('/api/upload/public', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photo.id, confirmation_token: token }),
      })
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Could not remove photo. Please try again.')
      }
    } catch {
      setError('Could not remove photo. Please check your connection.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-1"
        style={{ color: 'var(--color-ink-muted)' }}
      >
        Reference Photos <span style={{ fontWeight: 400 }}>(optional)</span>
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
        Share inspiration images with us.
      </p>

      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <PhotoThumb
            key={photo.id}
            src={photo.thumb}
            alt={`Reference photo ${i + 1}`}
            removeLabel={`Remove reference photo ${i + 1}`}
            onRemove={() => handleRemove(photo)}
            removing={removingId === photo.id}
          />
        ))}

        {photos.length < MAX_PHOTOS && (
          <AddPhotoTile
            onClick={() => fileInputRef.current?.click()}
            uploading={uploading}
            hasPhotos={photos.length > 0}
            addMoreLabel="Add more"
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
    </section>
  )
}
