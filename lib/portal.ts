import type { SupabaseClient } from '@supabase/supabase-js'
import { generateShortToken } from '@/lib/tokens'

// Passwordless "portal" token that lets a customer bookmark a link to their own
// order history (see app/my-orders) without an account. Previously a stateless
// HMAC blob (`base64url(customerId:sha256hmac)`, ~130 chars); now a short random
// token stored on `customers.portal_token` (migration 039) so the shared link is
// as compact as the per-order tracking/confirmation links.

const PORTAL_TOKEN_LENGTH = 12

/** Resolve a portal token to its customer id, or null if it matches no one. */
export async function resolvePortalToken(
  supabase: SupabaseClient,
  token: string
): Promise<string | null> {
  if (!token || token.length < 8) return null
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

/**
 * The customer's portal token. Reads `customers.portal_token`; if it is somehow
 * absent (row predates migration 039 and the column default never filled in),
 * mints one and persists it so the link stays stable across visits.
 */
export async function getPortalToken(
  supabase: SupabaseClient,
  customerId: string
): Promise<string> {
  const { data } = await supabase
    .from('customers')
    .select('portal_token')
    .eq('id', customerId)
    .maybeSingle()

  const existing = (data as { portal_token: string | null } | null)?.portal_token
  if (existing) return existing

  const token = generateShortToken(PORTAL_TOKEN_LENGTH)
  await supabase.from('customers').update({ portal_token: token }).eq('id', customerId)
  return token
}
