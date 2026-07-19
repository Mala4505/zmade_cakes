/**
 * Shared motion tokens for the app's animation system.
 * Every animated surface (Modal, kanban cards, order wizard steps) uses the
 * same easing and duration range so motion reads as one system: calm, fast,
 * never bouncy. Components must pair these with `useReducedMotion()` and
 * zero out durations/offsets when reduced motion is requested.
 */
export const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1]
