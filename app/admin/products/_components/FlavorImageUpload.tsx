'use client'

import { useState, useRef } from 'react'
import { ImageSquare, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui'
import { uploadFlavorImage, removeFlavorImage } from '@/lib/actions/products'

interface Props {
  flavorId: string
  currentUrl: string | null
  onChanged: (newUrl: string | null) => void
}

export function FlavorImageUpload({ flavorId, currentUrl, onChanged }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', { description: 'Please select an image file.' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadFlavorImage(flavorId, fd)
      if (result.error) {
        toast.error('Upload failed', { description: result.error })
      } else {
        onChanged(result.data!.url)
        toast.success('Photo updated')
      }
    } catch (err) {
      console.error('[FlavorImageUpload] upload failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const result = await removeFlavorImage(flavorId)
      if (result.error) {
        toast.error('Failed to remove photo', { description: result.error })
      } else {
        onChanged(null)
        toast.success('Photo removed')
      }
    } catch (err) {
      console.error('[FlavorImageUpload] remove failed:', err)
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (currentUrl) {
    return (
      <div
        className="relative w-full h-full min-h-[180px] rounded-xl overflow-hidden border group"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        {uploading ? (
          <div
            className="absolute inset-0 flex items-center justify-center text-[color:var(--color-cream)]"
            style={{ backgroundColor: 'rgba(25,22,20,0.45)' }}
          >
            <Spinner size={24} />
          </div>
        ) : (
          <div
            // Visible by default (touch-safe) and hover-gated only on pointer-capable (md+)
            // screens; focus-within still covers keyboard nav on desktop.
            className="absolute inset-0 flex items-center justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(25,22,20,0.45)' }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 text-xs font-semibold rounded-lg px-3"
              style={{ backgroundColor: 'rgba(252,249,245,0.92)', color: 'var(--color-ink)' }}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(252,249,245,0.92)', color: 'var(--color-danger)' }}
              aria-label="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="w-full h-full min-h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
      style={{
        borderColor: dragOver ? 'var(--color-teal)' : 'var(--color-border)',
        backgroundColor: dragOver ? 'var(--color-teal-light)' : undefined,
        color: 'var(--color-ink-muted)',
      }}
      onClick={() => !uploading && fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <Spinner size={28} />
      ) : (
        <>
          <ImageSquare size={28} weight="thin" />
          <span className="text-xs text-center px-4">Drop photo or click to upload</span>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
