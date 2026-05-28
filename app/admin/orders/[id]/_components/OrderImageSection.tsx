'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ImageGallery from '@/components/admin/ImageGallery'
import type { InquiryImage } from '@/lib/supabase/types'

interface Props {
  initialImages: InquiryImage[]
  inquiryId: string
}

export default function OrderImageSection({ initialImages, inquiryId }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<InquiryImage[]>(initialImages)

  useEffect(() => {
    setImages(initialImages)
  }, [initialImages])

  return (
    <ImageGallery
      images={images}
      uploadEndpoint="/api/upload"
      uploadExtras={{ inquiry_id: inquiryId, image_type: 'finished' }}
      onUpload={() => router.refresh()}
      onDelete={(id) => setImages((prev) => prev.filter((img) => img.id !== id))}
    />
  )
}
