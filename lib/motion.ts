/**
 * Shared motion tokens for the app's animation system.
 * Every animated surface (Modal, kanban cards, order wizard steps) uses the
 * same easing and duration range so motion reads as one system: calm, fast,
 * never bouncy. Components must pair these with `useReducedMotion()` and
 * zero out durations/offsets when reduced motion is requested.
 */
export const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1]

/**
 * Keeps a decorative loading state (CakeLoader) visible for at least `minMs`
 * from when it started, so a fast response doesn't cut it off before it
 * reads as anything. Only await this on success paths — never on error
 * paths, which should surface as fast as possible rather than being held
 * back to let an animation finish.
 */
export async function holdMinimumVisible(startedAt: number, minMs: number) {
  const elapsed = Date.now() - startedAt
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed))
  }
}
