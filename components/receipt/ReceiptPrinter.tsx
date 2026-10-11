'use client'

import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/ui'

export type ReceiptPrinterStage = 'processing' | 'printing' | 'complete'
export type ReceiptFeedMotion = 'smooth' | 'stepped'

export type ReceiptPrinterRootProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  /** When false, every transition is instant (no fades, no feed). */
  animate?: boolean
  children: ReactNode
  /** 'stepped' (default) feeds the paper in short bursts like a thermal printer. */
  feedMotion?: ReceiptFeedMotion
  stage: ReceiptPrinterStage
}
export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<'div'>
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<'div'>
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<'div'>
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<'div'> & {
  /** Fired once the 'printing' feed animation finishes (convenience; callers should keep a timeout fallback). */
  onFeedComplete?: () => void
}
export type ReceiptPrinterPaperProps = ComponentPropsWithRef<'article'>
export type ReceiptPrinterStatusProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  children?: ReactNode
}

type ReceiptPrinterContextValue = {
  animate: boolean
  feedMotion: ReceiptFeedMotion
  shouldMove: boolean
  stage: ReceiptPrinterStage
}

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null)

const easeOut = [0.23, 1, 0.32, 1] as const
const easeInOut = [0.77, 0, 0.175, 1] as const

// Torn/serrated bottom edge. Lives in a CSS custom property (not an inline
// clip-path) so the `print:[clip-path:none]` class can override it.
const receiptToothCount = 40
const receiptToothDepth = 4
const receiptToothPoints = Array.from({ length: receiptToothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2)
  const y = index % 2 === 0 ? '100%' : `calc(100% - ${receiptToothDepth}px)`
  return `${x}% ${y}`
}).join(', ')
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`

// translateY percentages resolve against the paper's own height, so the feed
// works for any receipt length: -100% + 2px always leaves exactly a 2px lip
// showing below the slot edge (Output's top), whatever the paper height.
const hiddenTransform = 'translateY(calc(-100% + 2px))'
const shownTransform = 'translateY(0%)'

const printingTransformKeyframes = [
  hiddenTransform, 'translateY(-91%)', 'translateY(-91%)', 'translateY(-81%)', 'translateY(-81%)',
  'translateY(-70%)', 'translateY(-70%)', 'translateY(-58%)', 'translateY(-58%)', 'translateY(-45%)',
  'translateY(-45%)', 'translateY(-32%)', 'translateY(-32%)', 'translateY(-20%)', 'translateY(-20%)',
  'translateY(-10%)', 'translateY(-10%)', 'translateY(-3%)', 'translateY(-3%)', shownTransform,
]
const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495,
  0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
]

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: 'Preparing your receipt',
  printing: 'Printing your receipt',
  complete: 'Payment received',
}

const machineClassName = [
  'relative isolate w-full overflow-hidden rounded-[var(--printer-radius)] p-[var(--printer-inset)] pb-8',
  'border border-[var(--color-forest-border)]',
  'bg-[color-mix(in_oklab,var(--color-forest-active)_35%,var(--color-forest))]',
  'shadow-[0_20px_36px_-20px_color-mix(in_oklab,var(--color-forest)_55%,transparent),0_6px_14px_-8px_color-mix(in_oklab,var(--color-forest)_24%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--color-forest-ink)_14%,transparent),inset_0_-1px_0_color-mix(in_oklab,black_45%,var(--color-forest))]',
  '[--printer-inner-radius:calc(var(--printer-radius)_-_var(--printer-inset))] [--printer-inset:0.75rem] [--printer-radius:1.5rem]',
  "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[url('/textures/plastic-noise.svg')] before:bg-[length:180px_180px] before:bg-repeat before:opacity-30 before:mix-blend-multiply before:content-['']",
  'print:hidden',
].join(' ')

const screenClassName = [
  'relative z-10 isolate overflow-hidden rounded-[var(--printer-inner-radius)] p-4',
  'border border-[var(--color-forest-border)] bg-[#08130e] text-[var(--color-forest-ink)]',
  'shadow-inner shadow-[#08130e]/80',
  "after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[inset_0_0_24px_4px_color-mix(in_oklab,#08130e_52%,transparent)] after:content-['']",
].join(' ')

const feedClassName = [
  'relative isolate',
  "before:pointer-events-none before:absolute before:inset-x-3 before:top-3 before:bottom-4 before:z-0 before:rounded-sm before:shadow-[0_8px_24px_color-mix(in_oklab,var(--color-ink)_24%,transparent)] before:content-['']",
  "after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-[var(--color-ink)]/10 after:blur-lg after:content-['']",
  // Print: no transform/opacity from the animation (inline styles, hence !important), no drop shadows.
  'print:!transform-none print:!opacity-100 print:before:hidden print:after:hidden',
].join(' ')

function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext)
  if (!context) throw new Error(`${component} must be used inside ReceiptPrinter.Root.`)
  return context
}

function ReceiptPrinterRoot({
  'aria-label': ariaLabel = 'Receipt printer',
  animate = true,
  children,
  className,
  feedMotion = 'stepped',
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = useReducedMotion()
  const context: ReceiptPrinterContextValue = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
  }

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn('relative isolate flex w-full max-w-sm flex-col items-center', className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  )
}

function ReceiptPrinterMachine({ children, className, ...props }: ReceiptPrinterMachineProps) {
  return (
    <div className={cn(machineClassName, className)} {...props}>
      {children}
      {/* Paper slot. Narrower inset on phones to match the wider mobile paper. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-3 bottom-[var(--printer-inset)] z-40 h-2 rounded-[0.25rem] border border-[#08130e] bg-[#08130e] shadow-inner shadow-black sm:inset-x-6"
      />
    </div>
  )
}

function ReceiptPrinterHeader({ children, className, ...props }: ReceiptPrinterHeaderProps) {
  return (
    <div className={cn('relative z-10 flex h-11 items-start justify-between', className)} {...props}>
      {children}
    </div>
  )
}

function ReceiptPrinterScreen({ children, className, ...props }: ReceiptPrinterScreenProps) {
  return (
    <div className={cn(screenClassName, className)} {...props}>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function StatusIndicator({
  animate,
  move,
  stage,
}: {
  animate: boolean
  move: boolean
  stage: ReceiptPrinterStage
}) {
  const isComplete = stage === 'complete'
  const transition = { duration: animate ? 0.16 : 0, ease: easeOut }
  const initial = { opacity: animate ? 0 : 1, transform: move ? 'scale(0.94)' : 'scale(1)' }
  const exit = { opacity: animate ? 0 : 1, transform: move ? 'scale(0.96)' : 'scale(1)' }

  return (
    <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
      <AnimatePresence initial={false} mode="sync">
        {isComplete ? (
          <motion.span
            key="complete"
            animate={{ opacity: 1, transform: 'scale(1)' }}
            className="col-start-1 row-start-1 grid place-items-center text-[color-mix(in_oklab,var(--color-success)_55%,white)]"
            exit={exit}
            initial={initial}
            transition={transition}
          >
            <CheckCircle size={18} weight="fill" />
          </motion.span>
        ) : (
          <motion.span
            key="working"
            animate={{ opacity: 1, transform: 'scale(1)' }}
            className="col-start-1 row-start-1 grid place-items-center text-[var(--color-forest-ink-muted)]"
            exit={exit}
            initial={initial}
            transition={transition}
          >
            <CircleNotch
              className={cn(animate && 'animate-spin motion-reduce:animate-none')}
              size={18}
              weight="bold"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

function ReceiptPrinterStatus({ children, className, ...props }: ReceiptPrinterStatusProps) {
  const { animate, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Status')

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)} {...props}>
      <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
      <div aria-live="polite" className="grid min-w-0 flex-1 items-center" role="status">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={stage}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            className="col-start-1 row-start-1 truncate text-xs leading-none font-medium text-[var(--color-forest-ink-muted)]"
            exit={{
              opacity: animate ? 0 : 1,
              transform: shouldMove ? 'translateY(-4px)' : 'translateY(0px)',
            }}
            initial={{
              opacity: animate ? 0 : 1,
              transform: shouldMove ? 'translateY(4px)' : 'translateY(0px)',
            }}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ReceiptPrinterPaper({ children, className, style, ref, ...props }: ReceiptPrinterPaperProps) {
  return (
    <article
      ref={ref}
      className={cn(
        "relative z-10 min-h-80 bg-[#fffdf9] bg-[url('/textures/receipt-paper.svg')] bg-cover bg-blend-soft-light px-5 pt-7 pb-8 font-mono text-[var(--color-ink)] sm:px-6",
        '[clip-path:var(--receipt-clip)] print:[clip-path:none]',
        className,
      )}
      style={{ '--receipt-clip': receiptClipPath, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </article>
  )
}

function ReceiptPrinterOutput({ children, className, onFeedComplete, ...props }: ReceiptPrinterOutputProps) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Output')
  const isReceiptVisible = stage !== 'processing'
  const isPrinting = stage === 'printing'
  const shouldUseSteppedFeed = feedMotion === 'stepped' && isPrinting && shouldMove

  const targetTransform: string | string[] = isPrinting && shouldMove
    ? shouldUseSteppedFeed ? printingTransformKeyframes : shownTransform
    : isReceiptVisible || !shouldMove ? shownTransform : hiddenTransform

  // `initial` is read on mount only. Mounting straight into 'printing' must
  // start from the hidden position and play the feed (initial={false} would
  // jump to the last keyframe). Mounting at 'complete' (or with animate off)
  // renders the finished receipt with no entrance. The hidden transform is
  // used regardless of reduced motion so SSR and client markup agree; with
  // reduced motion the transform transition is 0s, so only the fade shows.
  const initial = stage === 'complete' || !animate
    ? false
    : { opacity: 0, transform: hiddenTransform }

  return (
    <div
      className={cn(
        // No fixed height: Output sizes to the paper. overflow-hidden clips the
        // part of the paper translated above Output's top edge (the slot).
        // pb-6 leaves room for the paper's drop shadow at the bottom.
        'relative z-50 -mt-4 w-full max-w-full overflow-hidden px-4 pb-6 sm:w-[calc(80%+3rem)] sm:px-6',
        'print:mt-0 print:w-full print:overflow-visible print:px-0 print:pb-0',
        className,
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 -top-1 z-20 h-2 bg-[#08130e]/75 blur-[6px] sm:inset-x-6 print:hidden"
        />
      ) : null}
      <motion.div
        animate={{ opacity: isReceiptVisible ? 1 : 0, transform: targetTransform }}
        aria-hidden={stage !== 'complete'}
        className={feedClassName}
        initial={initial}
        onAnimationComplete={() => {
          if (isPrinting) onFeedComplete?.()
        }}
        transition={{
          opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
          transform: {
            duration: shouldMove ? 1.75 : 0,
            ease: shouldUseSteppedFeed ? 'linear' : easeInOut,
            times: shouldUseSteppedFeed ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export const ReceiptPrinter = {
  Root: ReceiptPrinterRoot,
  Machine: ReceiptPrinterMachine,
  Header: ReceiptPrinterHeader,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
}
