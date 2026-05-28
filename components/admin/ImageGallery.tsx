'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Image as ImageIcon } from '@phosphor-icons/react'
import { deleteInquiryImage } from '@/lib/actions/images'
import type { InquiryImage } from '@/lib/supabase/types'

interface Props {
  images: InquiryImage[]
  onUpload?: () => void
  onDelete?: (id: string) => void
  uploadEndpoint: string
  uploadExtras?: Record<string, string>
  readOnly?: boolean
}

export default function ImageGallery({ images, onUpload, onDelete, uploadEndpoint, uploadExtras, readOnly }: Props) {
  const [lightbox, setLightbox] = useState<InquiryImage | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (uploadExtras) Object.entries(uploadExtras).forEach(([k, v]) => fd.append(k, v))
      const res = await fetch(uploadEndpoint, { method: 'POST', body: fd })
      if (res.ok) onUpload?.()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await deleteInquiryImage(id)
    setDeletingId(null)
    onDelete?.(id)
  }

  if (images.length === 0 && readOnly) {
    return (
      <div className="flex items-center gap-2 py-3" style={{ color: 'var(--color-ink-muted)' }}>
        <ImageIcon size={16} />
        <span className="text-xs">No photos yet</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative rounded-lg overflow-hidden border cursor-pointer group"
            style={{ width: 100, height: 100, borderColor: 'var(--color-border)', flexShrink: 0 }}
            onClick={() => setLightbox(img)}
          >
            <img src={img.url_thumb} alt="" className="w-full h-full object-cover" />
            {!readOnly && onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(img.id) }}
                disabled={deletingId === img.id}
                className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
                aria-label="Delete image"
              >
                <X size={10} weight="bold" />
              </button>
            )}
          </div>
        ))}

        {!readOnly && uploadEndpoint && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              width: 100, height: 100, flexShrink: 0,
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink-muted)',
            }}
          >
            {uploading ? (
              <span className="text-[10px]">Uploading…</span>
            ) : (
              <>
                <Plus size={18} />
                <span className="text-[10px]">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative"
            >
              <img
                src={lightbox.url_original}
                alt=""
                className="rounded-xl object-contain"
                style={{ maxWidth: '90vw', maxHeight: '85vh' }}
              />
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute top-2 right-2 rounded-full p-1.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                <X size={16} weight="bold" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
