'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  /**
   * Upload target. Defaults to the public pre-inquiry endpoint used by the
   * customer /order form. The admin "New Inquiry" form passes '/api/upload'
   * instead — the authenticated admin upload route — since a public,
   * unauthenticated endpoint has no business being reachable from an admin page.
   * Both routes return slightly different key names for the same three URLs
   * (url_original/url_medium/url_thumb vs. original/medium/thumb); normalized
   * below so callers don't need to care which endpoint they're pointed at.
   */
  endpoint?: string
}

export default function ReferencePhotoUpload({ images, onChange, max = 6, endpoint = '/api/upload/order' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Counts nested dragenter/dragleave pairs (they bubble from the thumbnails and the
  // add-tile) so the drop-zone highlight only clears once the pointer truly leaves.
  const dragCounter = useRef(0)
  // Mirrors `images` for uploadFiles/the window-level paste listener below, both of
  // which would otherwise close over a stale array from whenever they were created.
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const remaining = max - imagesRef.current.length
    const filesToUpload = files.slice(0, remaining)
    const overflow = files.length - filesToUpload.length
    const overflowMessage = `Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added`

    if (filesToUpload.length === 0) {
      setError(overflowMessage)
      return
    }

    setUploading(true)
    setError(overflow > 0 ? overflowMessage : null)

    // Track the running list locally so each upload's result can be merged in
    // as soon as it resolves, without waiting on (or being blocked by) the others.
    let current = imagesRef.current
    let lastError: string | null = null

    await Promise.all(
      filesToUpload.map(async (file) => {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(endpoint, { method: 'POST', body: fd })
          const json = await res.json()
          if (res.ok) {
            const uploaded: ReferenceImage = {
              url_original: json.url_original ?? json.original,
              url_medium: json.url_medium ?? json.medium,
              url_thumb: json.url_thumb ?? json.thumb,
            }
            current = [...current, uploaded]
            imagesRef.current = current
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
  }, [max, endpoint])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    await uploadFiles(selected)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    void uploadFiles(dropped)
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Required so the browser treats this element as a valid drop target
    // instead of navigating to the dropped file.
    e.preventDefault()
  }

  // Paste-to-attach — listens page-wide (not just while this widget has focus), since
  // that's how users expect Ctrl/Cmd+V to work for an image they just copied. Only
  // mounted while this widget is on screen, so it never intercepts paste elsewhere.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const pastedImages = Array.from(e.clipboardData?.items ?? [])
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (pastedImages.length === 0) return
      e.preventDefault()
      void uploadFiles(pastedImages)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [uploadFiles])

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className="rounded-xl p-1 -m-1 transition-colors"
      style={
        isDragging
          ? { outline: '2px dashed var(--color-teal)', outlineOffset: 2, backgroundColor: 'var(--color-teal-light)' }
          : { outline: '2px dashed transparent', outlineOffset: 2 }
      }
    >
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

      <p className="text-xs mt-2" style={{ color: isDragging ? 'var(--color-teal-deep)' : 'var(--color-ink-muted)' }}>
        {isDragging ? 'Drop to attach' : 'Drag & drop, paste, or tap to add photos.'}
      </p>

      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
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
