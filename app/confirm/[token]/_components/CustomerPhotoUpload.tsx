'use client'

import { useState, useRef } from 'react'
import { Plus, Image as ImageIcon } from '@phosphor-icons/react'

interface Props {
  token: string
}

export default function CustomerPhotoUpload({ token }: Props) {
  const [uploadedThumbs, setUploadedThumbs] = useState<string[]>([])
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
      fd.append('confirmation_token', token)
      const res = await fetch('/api/upload/public', { method: 'POST', body: fd })
      if (res.ok) {
        const json = await res.json()
        if (json.thumb) {
          setUploadedThumbs((prev) => [...prev, json.thumb])
        }
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Upload failed. Please try again.')
      }
    } catch {
      setError('Upload failed. Please check your connection.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
        Share inspiration images with Zainab.
      </p>

      <div className="flex flex-wrap gap-2">
        {uploadedThumbs.map((thumb, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden border"
            style={{ width: 80, height: 80, flexShrink: 0, borderColor: 'var(--color-border)' }}
          >
            <img src={thumb} alt={`Reference photo ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-opacity"
          style={{
            width: 80,
            height: 80,
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
          ) : uploadedThumbs.length === 0 ? (
            <>
              <ImageIcon size={18} />
              <span className="text-[10px] text-center">Add photo</span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span className="text-[10px] text-center">Add more</span>
            </>
          )}
        </button>
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
    </section>
  )
}
