'use client'

import { useRef, useState } from 'react'
import { Plus, Image as ImageIcon, X } from 'lucide-react'

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
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/order', { method: 'POST', body: fd })
      const json = await res.json()
      if (res.ok) {
        onChange([...images, { url_original: json.url_original, url_medium: json.url_medium, url_thumb: json.url_thumb }])
      } else {
        setError(json.error ?? 'Upload failed. Please try again.')
      }
    } catch {
      setError('Upload failed. Please check your connection.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={img.url_thumb}
            className="relative rounded-xl overflow-hidden border"
            style={{ width: 72, height: 72, flexShrink: 0, borderColor: 'var(--color-border)' }}
          >
            <img src={img.url_thumb} alt={`Reference photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              aria-label={`Remove reference photo ${i + 1}`}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-opacity"
            style={{
              width: 72,
              height: 72,
              flexShrink: 0,
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink-muted)',
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
            aria-label="Add reference photo"
          >
            {uploading ? (
              <span className="text-[10px] text-center px-1">Uploading…</span>
            ) : images.length === 0 ? (
              <>
                <ImageIcon size={16} />
                <span className="text-[10px] text-center">Add photo</span>
              </>
            ) : (
              <Plus size={16} />
            )}
          </button>
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
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
