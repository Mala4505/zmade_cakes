import type { Metadata } from 'next'
import { Navbar } from '@/components/public/Navbar'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Inquire About a Cake',
  description: `Submit a custom cake inquiry to ${BRAND_NAME}`,
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar />
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
