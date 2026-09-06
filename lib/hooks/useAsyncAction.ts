'use client'

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useOptionalNavPending } from '@/components/admin/NavPendingContext'

/**
 * The one place a client mutation's loading + error lifecycle lives.
 *
 * Every `startTransition(async () => { try {…} catch {…} })` site in the admin
 * repeated the same three mistakes in different combinations: forgetting the
 * try/catch (so a *thrown* action pins the spinner forever), forgetting the
 * success toast, and calling `router.push`/`router.refresh` *inside* the
 * transition (so the button keeps spinning through the destination's full
 * server re-render, long after the write itself finished).
 *
 * `useAsyncAction` makes all three structurally impossible:
 *
 * - `pending` is guaranteed to resolve on both the success and the throw path.
 * - A built-in synchronous lock drops overlapping calls (double-tap, double-submit).
 * - `successToast` fires once, automatically, only on a clean success.
 * - `onSuccess` runs *after* `pending` has cleared (plus a short beat so the
 *   success toast is visible before the page starts changing) — so any
 *   navigation inside it never keeps the triggering button spinning. When a
 *   NavPendingProvider is in scope (the admin shell), that post-pending work
 *   is itself tracked so the top-of-viewport progress bar reflects the
 *   navigation — not the write itself, so a quick inline action with no
 *   `onSuccess` navigation never sweeps the shared bar for no reason.
 *
 * The action callback signals failure in whichever way is natural:
 *   - `return { error: 'message' }`  → error toast with that message, no onSuccess
 *   - `return false`                 → silent stop (the caller already showed field
 *                                       errors / its own UI), no toast, no onSuccess
 *   - `throw`                        → generic error toast (+ the thrown message as
 *                                       description), no onSuccess
 *   - anything else / `return`       → success
 */

type ActionOutcome = { error?: string | null } | false | void | undefined

interface AsyncActionOptions {
  /** Shown via `toast.success` on a clean success. */
  successToast?: string
  /**
   * Title for the error toast. Defaults to `'Something went wrong'` for thrown
   * errors and to the returned `error` string itself for `{ error }` results
   * (both cases put the underlying message in the toast description when a
   * string title is given). Pass `false` to suppress the toast entirely and
   * drive the UI off the returned `error` value instead.
   */
  errorToast?: string | false
  /**
   * Runs once, after `pending` has cleared, on a clean success only. Put
   * `router.push` / `router.refresh` here — never in the action body.
   */
  onSuccess?: () => void
}

export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<ActionOutcome> | ActionOutcome,
  options: AsyncActionOptions = {}
) {
  const [pending, startTransition] = useTransition()
  const [navPending, startNavTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Refs so `run` can stay identity-stable (safe to pass to memoised children)
  // while still seeing the latest closure values every render.
  const actionRef = useRef(action)
  actionRef.current = action
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Synchronous re-entrancy lock. `pending` (from useTransition) only flips true
  // on the next render, which is a wide-enough window for a fast double-tap to
  // slip two calls through — this closes it.
  const lockRef = useRef(false)
  const pendingSuccessRef = useRef<(() => void) | null>(null)

  // Fire the queued onSuccess only once the write transition has fully settled,
  // so navigation runs outside it and the triggering button stops spinning now.
  // A short beat after that — rather than starting the very next tick — gives the
  // success toast (which fires synchronously inside the write, before this effect
  // even runs) a moment to actually register before the page starts changing out
  // from under it.
  useEffect(() => {
    if (pending) return
    const cb = pendingSuccessRef.current
    if (!cb) return
    pendingSuccessRef.current = null
    const timer = setTimeout(() => startNavTransition(cb), 500)
    return () => clearTimeout(timer)
  }, [pending])

  // Surface the post-success work (typically a route change) to the shared
  // nav-progress bar when the admin shell is mounted. No-op elsewhere.
  //
  // Deliberately *not* `pending` (the write itself) here too — that was tried,
  // and it meant every quick inline mutation in the app (a settle toggle in a
  // table row, a status change, anything with no navigation at all) swept the
  // top-of-viewport bar across the whole page on every click. The button's own
  // `loading` state already gives immediate local feedback for those; the
  // shared bar stays reserved for the create/save flows that actually navigate
  // afterward, where a page-wide "still loading" cue earns its keep.
  const nav = useOptionalNavPending()
  const navId = useId()
  useEffect(() => {
    if (!nav) return
    nav.setActionPending(navId, navPending)
    return () => nav.setActionPending(navId, false)
  }, [nav, navPending, navId])

  const run = useCallback((...args: Args) => {
    if (lockRef.current) return
    lockRef.current = true
    setError(null)
    startTransition(async () => {
      const opts = optionsRef.current
      try {
        const outcome = await actionRef.current(...args)

        if (outcome === false) return // caller handled its own UI

        if (outcome && typeof outcome === 'object' && 'error' in outcome && outcome.error) {
          setError(outcome.error)
          if (opts.errorToast !== false) {
            if (typeof opts.errorToast === 'string') {
              toast.error(opts.errorToast, { description: outcome.error })
            } else {
              toast.error(outcome.error)
            }
          }
          return
        }

        if (opts.successToast) toast.success(opts.successToast)
        if (opts.onSuccess) pendingSuccessRef.current = opts.onSuccess
      } catch (err) {
        // Next.js signals redirect() / notFound() / forbidden() by throwing an
        // error whose `digest` is a framework sentinel ("NEXT_REDIRECT",
        // "NEXT_HTTP_ERROR_FALLBACK;404", …). Those must propagate so the
        // navigation/404 actually happens — swallowing them into a toast breaks
        // any action that redirects on success.
        const digest = (err as { digest?: unknown })?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw err

        const message = err instanceof Error ? err.message : 'Please try again.'
        console.error('[useAsyncAction]', err)
        setError(message)
        if (opts.errorToast !== false) {
          toast.error(typeof opts.errorToast === 'string' ? opts.errorToast : 'Something went wrong', {
            description: message,
          })
        }
      } finally {
        lockRef.current = false
      }
    })
  }, [])

  return { run, pending, error }
}
