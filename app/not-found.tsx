import { createServiceClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { BRAND_NAME } from '@/lib/brand'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: `Page Not Found — ${BRAND_NAME}` }

export default async function NotFound() {
  const supabase = createServiceClient()

  const [{ data: phoneRow }, { data: igRow }] = await Promise.all([
    supabase.from('business_settings').select('value').eq('key', 'business_phone').single(),
    supabase.from('business_settings').select('value').eq('key', 'business_instagram').single(),
  ])

  const businessPhone = (phoneRow?.value as string) ?? ''
  const businessInstagram = (igRow?.value as string) ?? ''
  const waNumber = businessPhone
    ? businessPhone.replace(/\D/g, '').replace(/^(?!965)/, '965')
    : ''

  return (
    <main
      className="min-h-svh"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <Navbar businessInstagram={businessInstagram} />

      <div className="flex flex-col items-center justify-center px-5 py-16 text-center gap-3">
        <p
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          We couldn't find that order link
        </p>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-ink-muted)' }}>
          The link may have expired or been mistyped. If you have questions, we're a message away.
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium mt-2"
            style={{ color: 'var(--color-teal)' }}
          >
            Message us →
          </a>
        )}
      </div>
    </main>
  )
}
