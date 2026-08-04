'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from '@phosphor-icons/react'
import { cancelInquiry } from '@/lib/actions/inquiries'
import { toast } from 'sonner'

export default function CancelInquiryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleCancel = () => {
    if (!confirm('Cancel this inquiry? This cannot be undone.')) return
    startTransition(async () => {
      // Without this try/catch, a thrown error here would leave `pending` stuck
      // true forever with no feedback shown.
      try {
        const result = await cancelInquiry(inquiryId)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Inquiry cancelled')
          router.refresh()
        }
      } catch (err) {
        console.error('[CancelInquiryButton] cancel failed:', err)
        toast.error('Something went wrong', {
          description: err instanceof Error ? err.message : 'Please try again.',
        })
      }
    })
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
