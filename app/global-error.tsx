'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { BRAND_NAME } from '@/lib/brand'

/**
 * Top-level catch-all. Replaces the root layout when active, so it must
 * render its own <html>/<body> and cannot rely on global CSS, fonts, or
 * design tokens; everything is inlined with the Atelier palette values.
 */
export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset: () => void
  unstable_retry?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const retry = unstable_retry ?? reset

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fcf9f5',
          color: '#191614',
          fontFamily:
            "Geist, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '360px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#006860',
            }}
          >
            {BRAND_NAME}
          </p>
          <h1
            style={{
              margin: '20px 0 0',
              fontSize: '16px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#7a7370',
            }}
          >
            An unexpected error interrupted the page. Trying again usually
            fixes it.
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              minHeight: '44px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'inherit',
              color: '#fcf9f5',
              backgroundColor: '#006860',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                margin: '16px 0 0',
                fontSize: '12px',
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                color: '#7a7370',
              }}
            >
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
