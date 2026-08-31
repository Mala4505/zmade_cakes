import { CheckCircle, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { Button } from '@/components/ui/Button'
import { whatsappUrl } from '@/lib/whatsapp'

export const metadata: Metadata = { title: 'Inquiry Received' }

export default async function OrderSuccessPage() {
  const { businessPhone: phone, businessInstagram: instagram } = await getBusinessContactSettings()

  const waUrl = phone
    ? whatsappUrl(phone, `Hi, I just submitted a cake inquiry on ${BRAND_NAME}!`)
    : ''

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div style={{ color: 'var(--color-teal)' }}>
        <CheckCircle size={64} weight="fill" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>We've received your inquiry!</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          We'll review your request and send you a confirmation link on WhatsApp soon.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3">
        {waUrl && (
          <Button
            href={waUrl}
            variant="primary"
            size="lg"
            className="rounded-xl w-full"
          >
            <WhatsappLogo size={18} weight="fill" />
            Message Us on WhatsApp
          </Button>
        )}
        {instagram && (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{instagram} on Instagram</p>
        )}
        <Link
          href="/my-orders"
          className="text-sm text-center"
          style={{ color: 'var(--color-teal)' }}
        >
          View your orders →
        </Link>
      </div>
    </div>
  )
}
