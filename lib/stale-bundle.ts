// Shared recovery for the "running an old JS bundle against a new deployment"
// failure mode. On the Vercel Hobby plan there's no Skew Protection, so once a
// deploy lands, a still-open client's chunk requests 404 and its server-action
// ids stop resolving. The symptom the user sees is dead buttons / wedged
// navigation until they manually reopen the site. AppUpdateNotifier upgrades the
// bundle proactively; this is the reactive net for the window before it does.

const RELOAD_GUARD_KEY = 'zmade:stale-recovery-reload'

const STALE_PATTERNS = [
  'ChunkLoadError',
  'Loading chunk',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Failed to find Server Action',
  'Invalid Server Actions request',
]

export function isStaleBundleError(err: unknown): boolean {
  if (!err) return false
  const parts: string[] = []
  if (typeof err === 'string') parts.push(err)
  else if (err instanceof Error) {
    parts.push(err.name, err.message)
    const digest = (err as { digest?: unknown }).digest
    if (typeof digest === 'string') parts.push(digest)
  } else {
    try {
      parts.push(String((err as { message?: unknown }).message ?? ''))
      parts.push(String((err as { name?: unknown }).name ?? ''))
    } catch {
      return false
    }
  }
  const haystack = parts.join(' ')
  return STALE_PATTERNS.some((p) => haystack.includes(p))
}

/**
 * Reload once to pick up the current deployment. Guarded by sessionStorage so a
 * genuinely persistent error (not deploy skew) can't put the tab in a reload
 * loop — the second occurrence falls through to the error boundary instead.
 * Returns true if a reload was triggered.
 */
export function attemptStaleRecoveryReload(): boolean {
  if (typeof window === 'undefined') return false
  const build = process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown'
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === build) return false
    sessionStorage.setItem(RELOAD_GUARD_KEY, build)
  } catch {
    // storage blocked — still worth one reload attempt, just without the guard
  }
  window.location.reload()
  return true
}

/** Called once the app has rendered successfully, meaning the last reload (if
 *  any) recovered cleanly — so a *future* stale error is allowed its own reload. */
export function clearStaleRecoveryGuard(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
  } catch {
    // ignore
  }
}
