'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ReceiptPrinter } from '@/components/receipt/ReceiptPrinter'
import { EASE_OUT_QUART } from '@/lib/motion'
import { ShareReceiptImageButton } from './ShareReceiptImageButton'

interface Props {
  receiptToken: string
  /** Without extension; passed through to the image export. */
  shareFileName: string
  /** On-screen receipt (thermal bill style), fed out of the printer. */
  children: ReactNode
  /** Formal receipt layout used for the saved/shared image. Rendered off-screen, captured on demand. */
  shareContent: ReactNode
}

// 'pending' is the SSR + hydration state: the receipt is laid out (so there is
// no layout shift) but invisible until the client decides whether to print.
type Phase = 'pending' | 'printing' | 'complete'

const FEED_FALLBACK_MS = 2200

function storageKey(token: string) {
  return `zm-receipt-printed:${token}`
}

function hasPrinted(token: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(token)) === '1'
  } catch {
    return false
  }
}

function markPrinted(token: string) {
  try {
    window.localStorage.setItem(storageKey(token), '1')
  } catch {
    // Blocked storage: the reveal just replays next visit.
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Only parsed when scripting is disabled, so no-JS visitors still get the receipt.
const NOSCRIPT_STYLE =
  '<style>[data-receipt-phase="pending"]{visibility:visible!important}</style>'

export function ReceiptReveal({ receiptToken, shareFileName, children, shareContent }: Props) {
  const [phase, setPhase] = useState<Phase>('pending')
  // True once this mount chose to play the feed; switches the printer's key so
  // Output mounts fresh in 'printing' and animates from the top.
  const [playing, setPlaying] = useState(false)
  const shareRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()

  // Runs after hydration but before paint, so the pending state never paints
  // on the client. Storage is only read here to keep hydration consistent.
  useLayoutEffect(() => {
    if (hasPrinted(receiptToken) || prefersReducedMotion()) {
      markPrinted(receiptToken)
      setPhase('complete')
      return
    }
    setPlaying(true)
    setPhase('printing')
  }, [receiptToken])

  const finish = useCallback(() => {
    setPhase((prev) => (prev === 'printing' ? 'complete' : prev))
  }, [])

  // Safety net: never stay stuck in 'printing' (backgrounded tab, the feed
  // animation not running, onFeedComplete never firing).
  useEffect(() => {
    if (phase !== 'printing') return
    timerRef.current = setTimeout(finish, FEED_FALLBACK_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [phase, finish])

  useEffect(() => {
    if (phase === 'complete' && playing) markPrinted(receiptToken)
  }, [phase, playing, receiptToken])

  const animate = playing && !reduceMotion
  const printerStage = phase === 'pending' ? 'complete' : phase

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_STYLE }} />
      <div
        data-receipt-phase={phase}
        // The bill is screen-only; printing uses the formal A4 sheet below.
        className={
          phase === 'pending' ? 'invisible w-full max-w-sm print:hidden' : 'w-full max-w-sm print:hidden'
        }
      >
        <ReceiptPrinter.Root
          key={playing ? 'print' : 'static'}
          stage={printerStage}
          animate={animate}
          className="w-full max-w-sm"
        >
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Screen>
              <ReceiptPrinter.Status />
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>
          <ReceiptPrinter.Output onFeedComplete={finish}>
            <ReceiptPrinter.Paper>{children}</ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter.Root>
      </div>

      {phase === 'complete' && (
        <motion.div
          className="no-print"
          initial={animate ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
        >
          <ShareReceiptImageButton targetRef={shareRef} fileName={shareFileName} />
        </motion.div>
      )}

      {/* Formal A4 sheet — the single source for both the shared image and the printout,
          so they match. On screen it's off-screen (not display:none, which html-to-image
          can't capture) and outside the 'invisible' pending wrapper, whose visibility the
          clone would inherit; the ref sits on an unpositioned inner div so the clone isn't
          offset off-canvas. The sheet is exactly A4 (210 × 297 mm) with its own margins in
          both modes; the page sets `@page { size: A4; margin: 0 }` so the printout is this
          sheet 1:1. Print height is a hair under 297mm so rounding never spills a blank page. */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[10000px] print:static">
        <div
          ref={shareRef}
          className="h-[297mm] w-[210mm] overflow-hidden bg-[#fefdfb] px-[16mm] py-[14mm] print:h-[296mm]"
        >
          {shareContent}
        </div>
      </div>
    </div>
  )
}
