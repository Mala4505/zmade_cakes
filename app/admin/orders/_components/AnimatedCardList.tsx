'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT_QUART } from '@/lib/motion'

interface AnimatedCardListProps {
  /** Stable-keyed items; nodes may be server-rendered card markup. */
  items: { id: string; node: ReactNode }[]
  /** Rendered after the list when it is empty. */
  empty?: ReactNode
}

/**
 * Client wrapper that animates cards entering/leaving a server-rendered list
 * (status mutations, filter toggles) instead of hard-snapping the DOM.
 * Matches the Modal's motion system: fade + slight-y, ~0.16s, ease-out-quart,
 * with the same `useReducedMotion()` guard. Siblings glide into place via
 * transform-only position animations.
 */
export default function AnimatedCardList({ items, empty }: AnimatedCardListProps) {
  const reduceMotion = useReducedMotion()

  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout={reduceMotion ? false : 'position'}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT_QUART }}
          >
            {item.node}
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && empty}
    </>
  )
}
