import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order a Cake — ZMade Cakes',
  description: 'Submit a custom cake inquiry to ZMade Cakes',
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col" style={{ backgroundColor: 'var(--color-cream)' }}>
      <header
        className="flex items-center justify-center h-16 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>
          ZMade Cakes
        </span>
      </header>
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="text-center py-6 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        © ZMade Cakes · Kuwait
      </footer>
    </div>
  )
}
