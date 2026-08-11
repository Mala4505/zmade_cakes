import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL').optional()
  ),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required').optional()
  ),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').default('http://localhost:3000'),
  VAPID_PUBLIC_KEY: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().min(1, 'VAPID_PUBLIC_KEY is required').optional()
  ),
  // Same value as VAPID_PUBLIC_KEY, mirrored under NEXT_PUBLIC_ so the browser can read it
  // to call subscribeToPush() client-side. VAPID_PRIVATE_KEY/SUBJECT stay server-only.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required').optional()
  ),
  VAPID_PRIVATE_KEY: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().min(1, 'VAPID_PRIVATE_KEY is required').optional()
  ),
  VAPID_SUBJECT: z.preprocess(
    (v) => (v == null || String(v).trim() === '' ? undefined : v),
    z.string().min(1, 'VAPID_SUBJECT is required').optional()
  ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Missing or invalid environment variables:')
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  throw new Error('Invalid environment variables — check .env.local')
}

export const env = parsed.data
