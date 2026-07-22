import { createHmac, timingSafeEqual } from 'crypto'

// Signed, passwordless "portal" token that lets a customer bookmark a link to
// their own order history (see app/my-orders) without an account or password.
export function generatePortalToken(customerId: string): string {
  const secret = process.env.PORTAL_TOKEN_SECRET ?? 'dev-secret'
  const hmac = createHmac('sha256', secret).update(customerId).digest('hex')
  return Buffer.from(`${customerId}:${hmac}`).toString('base64url')
}

export function verifyPortalToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const colonIdx = decoded.indexOf(':')
    if (colonIdx === -1) return null
    const customerId = decoded.slice(0, colonIdx)
    const hmac = decoded.slice(colonIdx + 1)
    const secret = process.env.PORTAL_TOKEN_SECRET ?? 'dev-secret'
    const expected = createHmac('sha256', secret).update(customerId).digest('hex')
    const hmacBuf = Buffer.from(hmac)
    const expectedBuf = Buffer.from(expected)
    if (hmacBuf.byteLength !== expectedBuf.byteLength) return null
    if (!timingSafeEqual(hmacBuf, expectedBuf)) return null
    return customerId
  } catch { return null }
}
