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
  EXPO_PUSH_API_URL: z.string().url().default('https://exp.host/--/api/v2/push/send'),
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
