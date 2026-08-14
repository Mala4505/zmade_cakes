import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Fraunces } from 'next/font/google'
import { Toaster } from 'sonner'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { Footer } from '@/components/public/Footer'
import { BRAND_NAME } from '@/lib/brand'
import './globals.css'

// Open Sauce Sans isn't on Google Fonts, so it's self-hosted via plain
// @font-face in globals.css (see /public/fonts/open-sauce-sans) instead of
// next/font/local.

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: 'variable',
  axes: ['opsz'],
  display: 'optional',
})

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s — ${BRAND_NAME}`,
  },
  description: `Custom cake orders by ${BRAND_NAME}, Kuwait.`,
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fcf9f5',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { businessPhone, businessInstagram } = await getBusinessContactSettings()

  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      // Guards against browser extensions (Grammarly, Dark Reader, password managers, etc.)
      // injecting attributes into <html>/<body> before hydration — not an app-caused mismatch.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer businessPhone={businessPhone} businessInstagram={businessInstagram} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'zmade-toast',
              title: 'zmade-toast-title',
              description: 'zmade-toast-desc',
              closeButton: 'zmade-toast-close',
            },
          }}
        />
      </body>
    </html>
  )
}
