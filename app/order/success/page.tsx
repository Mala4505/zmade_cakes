import { CheckCircle, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: `Order Received — ${BRAND_NAME}` }

export default async function OrderSuccessPage() {
  const supabase = createServiceClient()
  const { data: phoneRow } = await supabase.from('business_settings').select('value').eq('key', 'business_phone').single()
  const { data: igRow } = await supabase.from('business_settings').select('value').eq('key', 'business_instagram').single()

  const phone = (phoneRow?.value as string) ?? ''
  const instagram = (igRow?.value as string) ?? ''
  const cleaned = phone.replace(/\D/g, '')
  const waNumber = cleaned ? (cleaned.startsWith('965') ? cleaned : `965${cleaned}`) : ''

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div style={{ color: 'var(--color-teal)' }}>
        <CheckCircle size={64} weight="fill" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>We've received your order!</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          We'll review your request and send you a confirmation link on WhatsApp soon.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3">
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I just submitted a cake order on ${BRAND_NAME}!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            <WhatsappLogo size={18} weight="fill" />
            Message Us on WhatsApp
          </a>
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
