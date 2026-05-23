/**
 * Smoke test — Yuki-class URL validation (Batch 7a).
 *
 * Verifies all three defense layers reject the Yuki-class string pattern:
 *   1. validateUrl (src/lib/paste/classifier.ts) — whitespace in raw
 *   2. isUrlSuspect (src/lib/enrichment/profile-adapter.ts) — search/hash %20
 *      plus literal whitespace in raw
 *   3. Zod schemas (Artifact in src/schemas/proof-receipt-v0.1.ts,
 *      ArtifactSchema in src/lib/paste/publish.ts) — .trim() + refine
 *
 * Run:
 *   npx tsx scripts/v2/test-url-validation.ts
 *
 * Exit code 0 if all layers reject; non-zero if any layer accepts a
 * Yuki-class string.
 */

import { InvalidUrlError, validateUrl } from '../../src/lib/paste/classifier.ts'
import { isUrlSuspect } from '../../src/lib/enrichment/profile-adapter.ts'
import { Artifact } from '../../src/schemas/proof-receipt-v0.1.ts'

const YUKI_RAW =
  'https://web3-rho-gold.vercel.app/?_vercel_share=uNaepQN6RHQnSX6tmoobJxvizUpXufSL Multiple projects are available here'

const CLEAN_URL = 'https://web3-rho-gold.vercel.app/?_vercel_share=uNaepQN6RHQnSX6tmoobJxvizUpXufSL'

let failures = 0
function check(label: string, condition: boolean, detail: string): void {
  const status = condition ? 'PASS' : 'FAIL'
  console.log(`  [${status}] ${label} — ${detail}`)
  if (!condition) failures += 1
}

console.log('═'.repeat(72))
console.log('Yuki-class URL validation smoke test')
console.log('═'.repeat(72))
console.log(`Test string: ${YUKI_RAW.slice(0, 80)}…`)
console.log()

// ─── Layer 1: validateUrl ────────────────────────────────────────────────
console.log('Layer 1 — validateUrl (src/lib/paste/classifier.ts):')
let layer1Rejected = false
let layer1Reason = '(no rejection)'
try {
  validateUrl(YUKI_RAW)
} catch (e) {
  if (e instanceof InvalidUrlError) {
    layer1Rejected = true
    layer1Reason = e.reason
  } else {
    layer1Reason = `unexpected: ${(e as Error).message}`
  }
}
check('rejects Yuki-class', layer1Rejected, layer1Reason)

// Also verify the clean form still passes (regression guard).
let layer1AcceptsClean = false
try {
  validateUrl(CLEAN_URL)
  layer1AcceptsClean = true
} catch (e) {
  layer1AcceptsClean = false
  layer1Reason = (e as Error).message
}
check('accepts cleaned form', layer1AcceptsClean, layer1AcceptsClean ? 'parsed OK' : `incorrectly rejected: ${layer1Reason}`)
console.log()

// ─── Layer 2: isUrlSuspect ───────────────────────────────────────────────
console.log('Layer 2 — isUrlSuspect (src/lib/enrichment/profile-adapter.ts):')
// To exercise Layer 2, we need a parsed URL. validateUrl rejects the raw
// Yuki string before we can parse — so simulate the bypass by URL-parsing
// the percent-encoded form (which is what would land in url.search if
// validateUrl had been more lenient or skipped):
const encoded = YUKI_RAW.replace(/ /g, '%20')
let layer2Result: { suspect: boolean; reason?: string }
try {
  const parsedEncoded = new URL(encoded)
  layer2Result = isUrlSuspect(parsedEncoded, YUKI_RAW)  // pass raw (with whitespace)
} catch (e) {
  layer2Result = { suspect: false, reason: `URL parse failed: ${(e as Error).message}` }
}
check(
  'rejects raw with whitespace',
  layer2Result.suspect,
  layer2Result.reason ?? '(no reason given)'
)

// Also check the search-string %20 path directly (raw without whitespace,
// only encoded in URL.search). This is the precise gap that let #45
// through with the original pathname-only guard.
const encodedOnly = encoded  // raw is now the encoded form, no literal whitespace
let layer2SearchResult: { suspect: boolean; reason?: string }
try {
  const parsed = new URL(encodedOnly)
  layer2SearchResult = isUrlSuspect(parsed, encodedOnly)
} catch (e) {
  layer2SearchResult = { suspect: false, reason: `URL parse failed: ${(e as Error).message}` }
}
check(
  'rejects %20 in url.search (the original gap)',
  layer2SearchResult.suspect,
  layer2SearchResult.reason ?? '(no reason given)'
)

// Regression: the cleaned form should NOT be flagged suspect.
let layer2CleanResult: { suspect: boolean; reason?: string }
try {
  const parsedClean = new URL(CLEAN_URL)
  layer2CleanResult = isUrlSuspect(parsedClean, CLEAN_URL)
} catch (e) {
  layer2CleanResult = { suspect: true, reason: `URL parse failed: ${(e as Error).message}` }
}
check(
  'accepts cleaned form',
  !layer2CleanResult.suspect,
  layer2CleanResult.suspect ? `incorrectly flagged: ${layer2CleanResult.reason}` : 'not flagged'
)
console.log()

// ─── Layer 3: Zod Artifact schema ────────────────────────────────────────
console.log('Layer 3 — Zod Artifact schema (src/schemas/proof-receipt-v0.1.ts):')
const zodResult = Artifact.safeParse({
  kind: 'url',
  url: YUKI_RAW,
})
check(
  'rejects Yuki-class',
  !zodResult.success,
  zodResult.success ? '(accepted!)' : zodResult.error.issues.map(i => i.message).join('; ')
)

// Regression: cleaned form should parse fine.
const zodCleanResult = Artifact.safeParse({
  kind: 'url',
  url: CLEAN_URL,
})
check(
  'accepts cleaned form',
  zodCleanResult.success,
  zodCleanResult.success ? 'parsed OK' : zodCleanResult.error.issues.map(i => i.message).join('; ')
)
console.log()

// ─── Summary ─────────────────────────────────────────────────────────────
console.log('═'.repeat(72))
if (failures === 0) {
  console.log('✓ ALL LAYERS PASS — Yuki-class strings are rejected at all three layers.')
  console.log('═'.repeat(72))
  process.exit(0)
} else {
  console.log(`✗ ${failures} check(s) failed — see PASS/FAIL output above.`)
  console.log('═'.repeat(72))
  process.exit(1)
}
