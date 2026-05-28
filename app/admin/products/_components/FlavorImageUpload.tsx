'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
        onChanged(result.data.url)
        toast.success('Photo updated')
      }
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
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold rounded-lg px-3 py-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#1a1a1a' }}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--color-danger)' }}
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
        <Loader2 size={28} className="animate-spin" />
      ) : (
        <>
          <ImagePlus size={28} strokeWidth={1.5} />
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
