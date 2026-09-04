'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { inputBaseClass } from './Input'

const ITEM_HEIGHT = 36
const VISIBLE_ROWS = 5
const EDGE_PADDING = Math.floor(VISIBLE_ROWS / 2) * ITEM_HEIGHT
const EDGE_MASK =
  'linear-gradient(to bottom, transparent 0, black ' +
  Math.round(EDGE_PADDING * 0.5) +
  'px, black calc(100% - ' +
  Math.round(EDGE_PADDING * 0.5) +
  'px), transparent 100%)'

type Period = 'AM' | 'PM'

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
// 15-minute granularity is the whole point — this is the "skip" the native
// <input type="time"> couldn't deliver (its `step` only affects HTML5
// constraint validation, not the picker's actual increment).
const MINUTES = [0, 15, 30, 45].map((m) => ({ value: m, label: String(m).padStart(2, '0') }))
const PERIODS: { value: Period; label: string }[] = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
]

function to24Hour(hour12: number, minute: number, period: Period): string {
  const h = (hour12 % 12) + (period === 'PM' ? 12 : 0)
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function from24Hour(value: string): { hour12: number; minute: number; period: Period } | null {
  if (!value || !value.includes(':')) return null
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  // Defensive: snap to the nearest 15-min slot in case a legacy/odd value ever
  // reaches here (this component itself only ever writes 15-min-aligned values).
  const minute = MINUTES.reduce((closest, opt) => (Math.abs(opt.value - m) < Math.abs(closest - m) ? opt.value : closest), 0)
  return { hour12: h % 12 || 12, minute, period: h >= 12 ? 'PM' : 'AM' }
}

interface WheelColumnProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
  divider?: boolean
}

/** One independent scroll-snap column — the hour, minute, and AM/PM wheels each
 *  get their own instance, scrolling and settling entirely independently of
 *  one another (matching a native multi-wheel time picker, e.g. iOS's). */
function WheelColumn<T extends string | number>({ options, value, onChange, ariaLabel, disabled, divider }: WheelColumnProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUserScrolling = useRef(false)

  const indexFor = useCallback((v: T) => {
    const idx = options.findIndex((o) => o.value === v)
    return idx === -1 ? 0 : idx
  }, [options])
  const clamp = useCallback((i: number) => Math.min(options.length - 1, Math.max(0, i)), [options])

  const [liveIndex, setLiveIndex] = useState(() => indexFor(value))

  useEffect(() => {
    if (isUserScrolling.current) return
    const idx = indexFor(value)
    setLiveIndex(idx)
    scrollerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'auto' })
  }, [value, indexFor])

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  const commitFromScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const idx = clamp(Math.round(el.scrollTop / ITEM_HEIGHT))
    const next = options[idx].value
    if (next !== value) onChange(next)
  }, [options, value, onChange, clamp])

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true
    const el = scrollerRef.current
    if (el) {
      const idx = clamp(Math.round(el.scrollTop / ITEM_HEIGHT))
      setLiveIndex((prev) => (prev === idx ? prev : idx))
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      isUserScrolling.current = false
      commitFromScroll()
    }, 120)
  }, [clamp, commitFromScroll])

  const scrollToIndex = (idx: number, behavior: ScrollBehavior = 'smooth') => {
    const c = clamp(idx)
    scrollerRef.current?.scrollTo({ top: c * ITEM_HEIGHT, behavior })
    setLiveIndex(c)
    onChange(options[c].value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      scrollToIndex(liveIndex - 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      scrollToIndex(liveIndex + 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      scrollToIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      scrollToIndex(options.length - 1)
    }
  }

  return (
    <div
      ref={scrollerRef}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="relative flex-1 h-full overflow-y-scroll outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-teal)]"
      style={{
        scrollSnapType: 'y mandatory',
        paddingTop: EDGE_PADDING,
        paddingBottom: EDGE_PADDING,
        borderLeft: divider ? '1px solid var(--color-border)' : undefined,
        maskImage: EDGE_MASK,
        WebkitMaskImage: EDGE_MASK,
      }}
    >
      {options.map((opt, i) => (
        <div
          key={String(opt.value)}
          role="option"
          aria-selected={i === liveIndex}
          onClick={() => !disabled && scrollToIndex(i)}
          className="flex items-center justify-center cursor-pointer select-none transition-colors"
          style={{
            height: ITEM_HEIGHT,
            scrollSnapAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: i === liveIndex ? 600 : 400,
            color: i === liveIndex ? 'var(--color-teal-deep)' : 'var(--color-ink-muted)',
          }}
        >
          {opt.label}
        </div>
      ))}
    </div>
  )
}

function formatDisplay(value: string): string {
  const parsed = from24Hour(value)
  if (!parsed) return 'Not set'
  return `${parsed.hour12}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`
}

/** The three wheels alone, always expanded — used inside the popover below. */
function TimeWheel({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const parsed = from24Hour(value) ?? { hour12: 12, minute: 0, period: 'PM' as Period }

  return (
    <div
      className="relative flex rounded-lg border overflow-hidden"
      style={{ height: VISIBLE_ROWS * ITEM_HEIGHT, width: 208, borderColor: 'var(--color-border)', backgroundColor: 'var(--color-cream)' }}
    >
      {/* Fixed center band, shared across all three wheels — they scroll underneath it. */}
      <div
        aria-hidden="true"
        className="absolute left-1.5 right-1.5 rounded-md pointer-events-none"
        style={{ top: EDGE_PADDING, height: ITEM_HEIGHT, backgroundColor: 'var(--color-teal-light)' }}
      />
      <WheelColumn
        options={HOURS}
        value={parsed.hour12}
        onChange={(h) => onChange(to24Hour(h, parsed.minute, parsed.period))}
        ariaLabel="Hour"
        disabled={disabled}
      />
      <WheelColumn
        options={MINUTES}
        value={parsed.minute}
        onChange={(m) => onChange(to24Hour(parsed.hour12, m, parsed.period))}
        ariaLabel="Minute"
        disabled={disabled}
        divider
      />
      <WheelColumn
        options={PERIODS}
        value={parsed.period}
        onChange={(p) => onChange(to24Hour(parsed.hour12, parsed.minute, p))}
        ariaLabel="AM or PM"
        disabled={disabled}
        divider
      />
    </div>
  )
}

export interface TimeScrollPickerProps {
  /** 24-hour "HH:mm", or "" for unset. Stays unset until the user actually
   *  spins a wheel — an empty value just displays the neutral 12:00 PM position. */
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
  'aria-invalid'?: boolean
  'aria-label'?: string
}

/**
 * A native <input type="time">'s `step` attribute only governs HTML5 constraint
 * validation — Chrome, Firefox, and Edge all ignore it for the picker's actual
 * up/down-arrow and typed-value increment, so there's no real "jumps by 15
 * minutes" behavior available from the native control, and a single flat
 * dropdown doesn't read as a scrollable picker.
 *
 * The wheel itself (`TimeWheel` above, three independent scroll-snap columns —
 * hour / minute / AM-PM, matching a native multi-column time picker) is ~180px
 * tall — too much to sit permanently expanded in a form next to normal
 * ~44px fields. So it lives behind a compact trigger button (same height and
 * chrome as every other input) that opens it in a small popover on click.
 *
 * The popover is portal-rendered straight to `document.body` (same technique
 * `Modal.tsx` uses) with `position: fixed` coordinates computed from the
 * trigger's own bounding rect, rather than `position: absolute` nested under
 * the trigger. Every one of this component's 5 call sites lives inside the
 * admin shell's scrollable region or a form on a plain page — an absolutely
 * positioned popover there risks getting visually clipped by an ancestor's
 * `overflow-y-auto` the moment the trigger sits near the bottom of the
 * scrolled viewport; escaping to the body sidesteps that entirely.
 */
export function TimeScrollPicker({
  value,
  onChange,
  id,
  className,
  disabled,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}: TimeScrollPickerProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const openPopover = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 6, left: rect.left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // A fixed-position popover doesn't track the trigger if the page (or the
    // admin shell's scroll region) moves under it — closing on scroll is
    // simpler and less error-prone than re-measuring on every scroll tick.
    // `capture: true` catches scroll events from any scrollable ancestor, not
    // just the window itself, since scroll doesn't bubble — but that same trick
    // also catches the wheel columns' *own* internal scrolling (both the
    // sync-to-value scroll on mount and the user actually spinning a wheel),
    // since capture starts at `window` regardless of where the scroll
    // originates. Without this guard the popover closed itself the instant it
    // opened, and again the instant anyone tried to scroll a wheel.
    function onScroll(e: Event) {
      if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const isSet = from24Hour(value) !== null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={ariaInvalid || undefined}
        aria-label={ariaLabel ?? 'Time'}
        className={cn(inputBaseClass, 'text-base md:text-sm flex items-center justify-between gap-2 text-left')}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Clock size={15} className="shrink-0" style={{ color: 'var(--color-ink-muted)' }} />
          <span className="truncate" style={{ color: isSet ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
            {formatDisplay(value)}
          </span>
        </span>
        <CaretDown size={12} className="shrink-0" style={{ color: 'var(--color-ink-muted)' }} />
      </button>

      {mounted && open && coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose a time"
            className="fixed z-40 rounded-xl border p-2 flex flex-col gap-2"
            style={{
              top: coords.top,
              left: coords.left,
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              boxShadow: 'var(--shadow-floating)',
            }}
          >
            <TimeWheel value={value} onChange={onChange} disabled={disabled} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
            >
              Done
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
