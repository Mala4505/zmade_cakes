import { CheckCircle, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Order Received — ZMade Cakes' }

export default async function OrderSuccessPage() {
  const supabase = createServiceClient()
  const { data: phoneRow } = await supabase.from('business_settings').select('value').eq('key', 'business_phone').single()
  const { data: igRow } = await supabase.from('business_settings').select('value').eq('key', 'business_instagram').single()

  const phone = (phoneRow?.value as string) ?? '96500000000'
  const instagram = (igRow?.value as string) ?? '@zmadecakes.q8'
  const cleaned = phone.replace(/\D/g, '')
  const waNumber = cleaned.startsWith('965') ? cleaned : `965${cleaned}`

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div style={{ color: 'var(--color-teal)' }}>
        <CheckCircle size={64} weight="fill" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>We've received your order!</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          Zainab will review your request and send you a confirmation link on WhatsApp soon.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi, I just submitted a cake order on ZMade Cakes!")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#25D366', color: '#fff' }}
        >
          <WhatsappLogo size={18} weight="fill" />
          Message Zainab on WhatsApp
        </a>
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
