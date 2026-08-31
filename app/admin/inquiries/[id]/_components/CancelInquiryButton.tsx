'use client'

import { useRouter } from 'next/navigation'
import { X } from '@phosphor-icons/react'
import { cancelInquiry } from '@/lib/actions/inquiries'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'

export default function CancelInquiryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()

  const { run: cancel, pending } = useAsyncAction(
    async () => {
      const result = await cancelInquiry(inquiryId)
      if (result.error) return { error: result.error }
    },
    {
      successToast: 'Inquiry cancelled',
      onSuccess: () => router.refresh(),
    }
  )

  const handleCancel = () => {
    if (!confirm('Cancel this inquiry? This cannot be undone.')) return
    cancel()
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-all active:scale-[0.97] disabled:opacity-60 mt-4"
      style={{
        borderColor: 'var(--color-danger-light)',
        color: 'var(--color-danger)',
        backgroundColor: 'transparent',
      }}
    >
      <X size={15} />
      Cancel Inquiry
    </button>
  )
}
