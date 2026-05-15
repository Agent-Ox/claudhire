/**
 * ULID generator.
 *
 * Produces 26-char Crockford base32 strings — 48-bit ms timestamp + 80-bit
 * randomness. Compatible with the regex on EntityRef / ProofReceipt in
 * src/schemas/proof-receipt-v0.1.ts:
 *   /^shipstacked:(entity|proof):[0-9A-HJKMNP-TV-Z]{26}$/
 *
 * Inline implementation — no dependency added. The spec is well-defined and
 * the code is ~30 lines, smaller than the resulting node_modules folder.
 */

import { randomBytes } from 'node:crypto';

// Crockford base32 alphabet — I, L, O, U removed to reduce ambiguity.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(now: number, len: number): string {
  let n = now;
  let out = '';
  for (let i = 0; i < len; i++) {
    const mod = n % 32;
    out = ALPHABET[mod] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

function encodeRandom(len: number): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % 32];
  }
  return out;
}

export function ulid(): string {
  return encodeTime(Date.now(), 10) + encodeRandom(16);
}

export function entityExternalId(): string {
  return `shipstacked:entity:${ulid()}`;
}

export function proofExternalId(): string {
  return `shipstacked:proof:${ulid()}`;
}
