import { randomBytes } from 'crypto'

// Excludes 0/O and 1/I/l — the only characters that get misread when a token is
// glanced at on a phone screen or retyped from a screenshot.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'

/**
 * Short, URL-safe token for confirmation/tracking links shared over WhatsApp.
 * Replaces the previous UUID default (36 chars) with something a customer can
 * actually see the shape of — 10 chars from a 56-symbol alphabet is ~57 bits
 * of entropy, comfortably unguessable for a per-order link.
 */
export function generateShortToken(length = 10): string {
  const bytes = randomBytes(length)
  let token = ''
  for (let i = 0; i < length; i++) {
    token += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return token
}
