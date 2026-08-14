import { createHash } from 'crypto';

/**
 * One-way hash for privacy-sensitive identifiers (client IP, session id).
 * Salted with a server-side pepper so hashes can't be rainbow-tabled back
 * to raw IPs, while still allowing rate-limit / abuse-pattern matching.
 */
export function hashWithPepper(value: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
}
