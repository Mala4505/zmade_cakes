import { connection } from 'next/server'

// Reports the build id of the currently-deployed server. The running client
// compares this against the NEXT_PUBLIC_BUILD_ID baked into its own bundle; a
// mismatch means a newer build has shipped and the app should reload.
//
// `connection()` opts the handler out of prerendering so it always reflects the
// live deployment, and `no-store` keeps every layer (browser, CDN, PWA) from
// serving a stale answer.
export async function GET() {
  await connection()

  return Response.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown' },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}
