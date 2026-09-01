'use client'

import { useEffect, useRef } from 'react'

// The build id compiled into *this* running bundle (injected via next.config.ts `env`).
const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID

const POLL_INTERVAL_MS = 60_000
// In the foreground, wait for this much input-free time before reloading.
const IDLE_BEFORE_RELOAD_MS = 20_000
// Treat a form control touched within this window as "still being edited".
const RECENT_EDIT_MS = 90_000
// sessionStorage key: the build id we've already reloaded for (loop guard).
const RELOADED_FOR_KEY = 'zmade:reloaded-for-build'

/**
 * Silently reloads the installed PWA into a newer deployment.
 *
 * The installed app (home-screen, especially iOS) resumes its old session
 * instead of reloading, so a deploy goes unnoticed until a manual refresh. This
 * polls the server's live build id and, when it differs from the build the user
 * is running, reloads automatically — but only at a moment that can't lose work:
 *
 *   1. when the app is backgrounded / being closed (reload lands on next open), or
 *   2. after ~20s of no typing or tapping while it's open,
 *
 * and never while a form field is focused or was edited in the last ~90s. A form
 * that must not be interrupted can set `window.__ZMADE_BLOCK_RELOAD__ = true`
 * while it has unsaved changes.
 *
 * No service-worker caching involved; behaves the same on iOS and Android.
 */
export function AppUpdateNotifier() {
  const pendingBuildId = useRef<string | null>(null)
  const lastEditAt = useRef(0)
  const lastActivityAt = useRef(Date.now())
  const reloading = useRef(false)

  useEffect(() => {
    if (!RUNNING_BUILD_ID) return

    let cancelled = false

    const isEditing = () => {
      if (typeof window !== 'undefined' && (window as unknown as { __ZMADE_BLOCK_RELOAD__?: boolean }).__ZMADE_BLOCK_RELOAD__) {
        return true
      }
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) {
        return true
      }
      return Date.now() - lastEditAt.current < RECENT_EDIT_MS
    }

    const doReload = () => {
      if (reloading.current || !pendingBuildId.current) return
      reloading.current = true
      try {
        sessionStorage.setItem(RELOADED_FOR_KEY, pendingBuildId.current)
      } catch {
        // private mode / storage disabled — the poll's own build-id check still
        // stops a second reload within this session.
      }
      window.location.reload()
    }

    const maybeReload = () => {
      if (cancelled || reloading.current || !pendingBuildId.current) return
      // Backgrounded or unloading: safe to reload now — it takes effect on reopen.
      if (document.visibilityState === 'hidden') {
        doReload()
        return
      }
      // Foreground: only once the user has clearly paused and isn't mid-edit.
      const idleFor = Date.now() - lastActivityAt.current
      if (idleFor >= IDLE_BEFORE_RELOAD_MS && !isEditing()) doReload()
    }

    async function check() {
      if (cancelled || pendingBuildId.current) return
      if (document.visibilityState !== 'visible') return

      let latest: string | undefined
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        latest = (await res.json())?.buildId
      } catch {
        return
      }

      if (cancelled || pendingBuildId.current) return
      if (!latest || latest === 'unknown' || latest === RUNNING_BUILD_ID) return

      // Already reloaded once for this id and still mismatching → misconfigured
      // build id. Stop, don't loop.
      try {
        if (sessionStorage.getItem(RELOADED_FOR_KEY) === latest) {
          console.warn('[AppUpdateNotifier] build id still mismatched after reload; giving up', {
            running: RUNNING_BUILD_ID,
            latest,
          })
          cancelled = true
          return
        }
      } catch {
        // ignore
      }

      pendingBuildId.current = latest
      maybeReload()
    }

    const markActivity = () => {
      lastActivityAt.current = Date.now()
    }
    const markEdit = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        lastEditAt.current = Date.now()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') maybeReload()
      else check()
    }

    const startTimer = setTimeout(check, 3_000)
    const pollTimer = setInterval(check, POLL_INTERVAL_MS)
    const idleTimer = setInterval(maybeReload, 5_000)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', maybeReload)
    window.addEventListener('focus', check)
    window.addEventListener('pointerdown', markActivity, { passive: true, capture: true })
    window.addEventListener('keydown', markActivity, { passive: true, capture: true })
    window.addEventListener('input', markEdit, { passive: true, capture: true })
    window.addEventListener('change', markEdit, { passive: true, capture: true })

    return () => {
      cancelled = true
      clearTimeout(startTimer)
      clearInterval(pollTimer)
      clearInterval(idleTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', maybeReload)
      window.removeEventListener('focus', check)
      window.removeEventListener('pointerdown', markActivity, { capture: true })
      window.removeEventListener('keydown', markActivity, { capture: true })
      window.removeEventListener('input', markEdit, { capture: true })
      window.removeEventListener('change', markEdit, { capture: true })
    }
  }, [])

  return null
}
