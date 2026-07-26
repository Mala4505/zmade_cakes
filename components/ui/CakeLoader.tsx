'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_OUT_QUART } from '@/lib/motion'

const DURATION = 4.4
// Shared keyframe times (fraction of one loop): mix -> tilt-pour -> tiers
// rise -> frosting swirl -> swapped for a lit candle -> hold -> reset.
const T = [0, 0.26, 0.32, 0.42, 0.5, 0.64, 0.72, 0.86, 0.92, 1]

/**
 * Full-scene loading indicator for prominent, single-purpose waits (order
 * submit, confirmation processing) — not a drop-in replacement for the
 * inline `Spinner` used inside buttons. Solid silhouette style, traced from
 * a Stitch reference: mixing bowl -> tilt-pour into a pan -> two-tier cake
 * rises -> frosting swirl piped on -> swapped for a lit candle, then resets.
 *
 * Every element animates only `opacity` and `transform` (via wrapping `<g>`
 * offsets, never the SVG `x`/`y`/`cx`/`cy` attributes directly) to stay on
 * the same rule the rest of the app's motion follows.
 */
export function CakeLoader({
  size = 96,
  label,
  className,
}: {
  size?: number
  label?: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        {/* Reduced motion means calmer, not inert — a fully static loader
            during a real wait can read as stuck. Opacity-only breathing
            (no transform, no position change) keeps the "still working" cue
            without the movement that motion-sensitive users asked to avoid. */}
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
          animate={{ opacity: [1, 0.75] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatType: 'mirror', ease: EASE_OUT_QUART }}
        >
          <rect x="26" y="64" width="48" height="17" rx="4" fill="var(--color-ink)" />
          <rect x="34" y="50" width="32" height="15" rx="4" fill="var(--color-ink)" />
          <rect x="32" y="63" width="36" height="2" fill="var(--color-cream)" />
          <rect x="48" y="32" width="4" height="17" rx="1" fill="var(--color-ink)" />
          <path
            d="M50 20 Q46 26 47.5 30 Q48.5 32.5 50 32.5 Q51.5 32.5 52.5 30 Q54 26 50 20 Z"
            fill="var(--color-teal)"
          />
        </motion.svg>
        {label && (
          <p style={{ color: 'var(--color-ink-muted)' }} className="text-sm">
            {label}
          </p>
        )}
      </div>
    )
  }

  const seg = (values: number[]) => ({
    values,
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  })

  const bowl = seg([1, 1, 0, 0, 0, 0, 0, 0, 0, 1])
  const pour = seg([0, 0, 1, 1, 0, 0, 0, 0, 0, 0])
  const vessel = {
    values: [0, 0, -26, -26, 0, 0, 0, 0, 0, 0],
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  const stream = {
    values: [0.2, 0.2, 1, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
    opacityValues: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  const cakeOpacity = seg([0, 0, 0, 0, 1, 1, 1, 1, 1, 0])
  const cakeY = seg([6, 6, 6, 6, 0, 0, 0, 0, 0, 6])
  const swirlOpacity = seg([0, 0, 0, 0, 0, 1, 1, 0, 0, 0])
  const swirlClip = {
    values: [
      'inset(100% 0 0 0)', 'inset(100% 0 0 0)', 'inset(100% 0 0 0)', 'inset(100% 0 0 0)',
      'inset(100% 0 0 0)', 'inset(0% 0 0 0)', 'inset(0% 0 0 0)', 'inset(0% 0 0 0)',
      'inset(0% 0 0 0)', 'inset(100% 0 0 0)',
    ],
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  // Candle fades out a beat before the cake body (idx7, not idx9) — the
  // accent that arrived last also leaves first, so the ending unbuilds in
  // reverse rather than every element vanishing on the same frame.
  const candleOpacity = seg([0, 0, 0, 0, 0, 0, 1, 1, 0, 0])
  const candleYTransition = {
    duration: DURATION,
    times: [0, 0.72, 0.79, 0.82, 0.85, 1],
    repeat: Infinity,
    ease: EASE_OUT_QUART,
  }
  // A falling object doesn't stop dead — land at 0, overshoot ~2px, settle back.
  const candleY = { values: [-10, -10, 0, 2, 0, -10], transition: candleYTransition }
  const flame = {
    values: [1, 1.1, 0.94, 1.05, 1],
    rotate: [0, -4, 3, -2, 0],
    transition: { duration: 0.6, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  // Landing cue — a soft teal ripple right when the candle settles, spending
  // the app's one accent on impact rather than on more surface area.
  const ripple = {
    opacityValues: [0, 0, 0, 0, 0, 0, 0, 0.55, 0, 0],
    scaleValues: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1, 2.4, 2.4],
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  const whiskRotate = {
    values: [0, -16, 16, -9, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  const bowlJiggle = {
    values: [0, 1.2, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: EASE_OUT_QUART },
  }
  // The two shape-swap moments (bowl->pour, pour->cake) get a brief blur to
  // bridge the silhouettes, since both are moments where genuinely
  // different shapes overlap.
  const sceneBlur = {
    values: [
      'blur(0px)', 'blur(1.5px)', 'blur(0px)', 'blur(0px)', 'blur(1.5px)',
      'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)',
    ],
    transition: { duration: DURATION, times: T, repeat: Infinity, ease: EASE_OUT_QUART },
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <motion.g animate={{ filter: sceneBlur.values }} transition={sceneBlur.transition}>
          {/* Mixing bowl + whisk */}
          <motion.g animate={{ opacity: bowl.values }} transition={bowl.transition}>
            <motion.g animate={{ rotate: bowlJiggle.values }} transition={bowlJiggle.transition} style={{ originX: '50px', originY: '65px' }}>
              <path
                d="M28 46 Q26 46 27 50 L33 74 Q35 80 42 80 L58 80 Q65 80 67 74 L73 50 Q74 46 72 46 Q60 44 50 44 Q40 44 28 46 Z"
                fill="var(--color-ink)"
              />
              <rect x="44" y="79" width="12" height="5" rx="2" fill="var(--color-ink)" />
            </motion.g>
            <motion.g
              animate={{ rotate: whiskRotate.values }}
              transition={whiskRotate.transition}
              style={{ originX: '68px', originY: '22px' }}
            >
              <line x1="68" y1="22" x2="52" y2="46" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
              <path d="M52 46 Q45 53 48 61 Q50 65 52 61 Q54 53 52 46" stroke="var(--color-ink)" strokeWidth="1.6" fill="none" />
              <path d="M52 46 Q59 53 56 61 Q54 65 52 61" stroke="var(--color-ink)" strokeWidth="1.6" fill="none" />
            </motion.g>
          </motion.g>

          {/* Tilt-pour into pan. Pan painted first so the stream (painted
              after) stays visible flowing down into it. The vessel animates
              its own tip-over instead of appearing already-tilted. */}
          <motion.g animate={{ opacity: pour.values }} transition={pour.transition}>
            <ellipse cx="58" cy="78" rx="26" ry="9" fill="var(--color-ink)" />
            <motion.g animate={{ rotate: vessel.values }} transition={vessel.transition} style={{ originX: '36px', originY: '38px' }}>
              <path
                d="M20 30 Q18 30 19 34 L24 46 Q26 50 32 50 L42 50 Q48 50 50 46 L54 34 Q55 30 53 30 Q42 27 36 27 Q28 27 20 30 Z"
                fill="var(--color-ink)"
              />
            </motion.g>
            <motion.path
              d="M44 44 Q48 52 52 60 Q57 68 61 74 Q63 77 60 79 Q55 76 51 70 Q45 60 41 48 Z"
              fill="var(--color-ink)"
              animate={{ scaleY: stream.values, opacity: stream.opacityValues }}
              transition={stream.transition}
              style={{ originX: '48px', originY: '45px' }}
            />
            <path d="M34 75 Q58 68 82 75" stroke="var(--color-cream)" strokeWidth="1.6" fill="none" />
          </motion.g>

          {/* Two-tier cake body — shared between the swirl and candle stages */}
          <motion.g animate={{ opacity: cakeOpacity.values, y: cakeY.values }} transition={cakeOpacity.transition}>
            <rect x="26" y="64" width="48" height="17" rx="4" fill="var(--color-ink)" />
            <rect x="34" y="50" width="32" height="15" rx="4" fill="var(--color-ink)" />
            <rect x="32" y="63" width="36" height="2" fill="var(--color-cream)" />
          </motion.g>

          {/* Frosting swirl, piped on bottom-up */}
          <motion.path
            d="M46 50 Q44 44 48 40 Q52 36 50 32 Q54 34 55 38 Q57 42 53 46 Q50 49 46 50 Z"
            fill="var(--color-ink)"
            animate={{ opacity: swirlOpacity.values, clipPath: swirlClip.values }}
            transition={swirlOpacity.transition}
          />

          {/* Candle — the single accent color. Landing ripple, then the flame
              flickers continuously on its own faster loop. */}
          <motion.circle
            cx="50"
            cy="48"
            r="4.5"
            fill="none"
            stroke="var(--color-teal)"
            strokeWidth="1.5"
            animate={{ opacity: ripple.opacityValues, scale: ripple.scaleValues }}
            transition={ripple.transition}
            style={{ originX: '50px', originY: '48px' }}
          />
          <motion.g animate={{ opacity: candleOpacity.values, y: candleY.values }} transition={{ opacity: candleOpacity.transition, y: candleY.transition }}>
            <rect x="48" y="32" width="4" height="17" rx="1" fill="var(--color-ink)" />
            <motion.path
              d="M50 20 Q46 26 47.5 30 Q48.5 32.5 50 32.5 Q51.5 32.5 52.5 30 Q54 26 50 20 Z"
              fill="var(--color-teal)"
              animate={{ scaleY: flame.values, rotate: flame.rotate }}
              transition={flame.transition}
              style={{ originX: '50px', originY: '32px' }}
            />
          </motion.g>
        </motion.g>
      </svg>
      {label && (
        <p style={{ color: 'var(--color-ink-muted)' }} className="text-sm">
          {label}
        </p>
      )}
    </div>
  )
}
