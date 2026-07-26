import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from 'sonner'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'
import { Footer } from '@/components/public/Footer'
import { BRAND_NAME } from '@/lib/brand'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
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
  themeColor: '#fcf9f5',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { businessPhone, businessInstagram } = await getBusinessContactSettings()

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} h-full antialiased`}
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
