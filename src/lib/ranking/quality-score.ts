// Formula E — proof-of-work-compliant quality scoring (Batch 7b §H lock).
//
// Single source of truth for the ranking score. Pure functions only — no I/O,
// no Supabase. Callers fetch receipts and pass them in.
//
// Implements the six locked "Proof-of-work scoring discipline" signals
// (SESSION_2026-05-19_DECISIONS.md) per the §F.7 spec in
// DISCOVERY_batch7_quality_scoring.md, plus the three Batch-7b-v1 fixes:
//   1. shared-doc host blocklist  — docs/drive/sheets.google.com + *.make.com
//      are shared *documents*, not owned/deployed artifacts; excluded from breadth.
//   2. dead-host exclusion         — breadth counts hosts only among
//      L1_artifact_confirmed receipts (dead links are L0_claimed and drop out).
//   3. log-scaled distinct hosts   — breadth is log2(1+hosts), not raw volume.
//
// Threshold-gate note: §F.7 wrote "receipts < 3". We gate on EFFECTIVE receipts
// (L1 + non-blocklisted host) rather than raw count, so a builder whose only
// real artifact is one valid host (the rest shared-docs/dead) is correctly
// "not yet ranked" rather than ranked on padding. This is the interpretation
// required by the locked acceptance criteria (olalekan-class → below threshold).

export interface ReceiptForScoring {
  atlas_confidence: number | null
  verification_level: string | null
  event_type: string | null
  artifacts: Array<{ url?: string | null }> | null
  issued_at: string | null
}

export interface QualityScoreResult {
  score: number | null      // 0–100, or null when below threshold ("not yet ranked")
  ranked: boolean
  distinctHosts: number      // distinct, non-blocklisted hosts among L1 receipts
  medianConf: number         // 0–1
  l1Ratio: number            // 0–1
  eventDiversity: number     // count of distinct event types
  recency: number            // 0–1 (linear decay over the recency window)
}

// Tournament-locked weights (§F.7, balanced candidate).
export const WEIGHTS = { w1: 14, w2: 0.30, w3: 0.18, w4: 8, w5: 12 } as const
export const FEATURED_BOOST = 5
export const RECENCY_WINDOW_DAYS = 180
export const THRESHOLD_MIN_RECEIPTS = 3
export const THRESHOLD_MIN_HOSTS = 2
export const L1 = 'L1_artifact_confirmed'

// Shared-document hosts that are NOT owned/deployed artifacts (operator-confirmed
// against current receipt data 2026-05-24). Verbatim regex per §H lock.
export const SHARED_DOC_HOST_RE = /^(docs|drive|sheets)\.google\.com$|\.make\.com$/

/** Registrable host from an artifact URL — mirrors the §F.7 SQL host extraction. */
export function extractHost(url: string | null | undefined): string | null {
  if (!url) return null
  const stripped = url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '')
  const host = stripped.split('/')[0]
  return host || null
}

export function isSharedDocHost(host: string): boolean {
  return SHARED_DOC_HOST_RE.test(host)
}

/**
 * Breadth + effective-receipt stats over L1 receipts with a valid, non-blocklisted
 * first-artifact host. distinctHosts feeds the breadth term; effectiveReceipts
 * feeds the threshold gate.
 */
export function l1HostStats(receipts: ReceiptForScoring[]): { distinctHosts: number; effectiveReceipts: number } {
  const hosts = new Set<string>()
  let effectiveReceipts = 0
  for (const r of receipts) {
    if (r.verification_level !== L1) continue
    const host = extractHost(r.artifacts?.[0]?.url)
    if (!host || isSharedDocHost(host)) continue
    hosts.add(host)
    effectiveReceipts++
  }
  return { distinctHosts: hosts.size, effectiveReceipts }
}

/** Median atlas_confidence across all receipts (resists single-lucky-receipt inflation). */
export function medianConfidence(receipts: ReceiptForScoring[]): number {
  const vals = receipts
    .map(r => r.atlas_confidence)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b)
  if (vals.length === 0) return 0
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
}

/** Fraction of receipts that are L1_artifact_confirmed (reachability). */
export function l1Ratio(receipts: ReceiptForScoring[]): number {
  if (receipts.length === 0) return 0
  const l1 = receipts.filter(r => r.verification_level === L1).length
  return l1 / receipts.length
}

/** Count of distinct event types (range, not repetition). */
export function eventDiversity(receipts: ReceiptForScoring[]): number {
  const types = new Set<string>()
  for (const r of receipts) if (r.event_type) types.add(r.event_type)
  return types.size
}

/** Linear recency decay over RECENCY_WINDOW_DAYS, based on the most recent receipt. */
export function recency(receipts: ReceiptForScoring[]): number {
  let maxMs = 0
  for (const r of receipts) {
    if (!r.issued_at) continue
    const t = Date.parse(r.issued_at)
    if (Number.isFinite(t) && t > maxMs) maxMs = t
  }
  if (maxMs === 0) return 0
  const days = (Date.now() - maxMs) / 86_400_000
  return Math.max(0, 1 - days / RECENCY_WINDOW_DAYS)
}

/**
 * Compute the Formula E quality score for one builder's receipts.
 * Below-threshold builders return { score: null, ranked: false } and surface
 * as "not yet ranked" in the UI (Stack Overflow sub-threshold model).
 */
export function computeQualityScore(
  receipts: ReceiptForScoring[],
  opts: { featured?: boolean } = {}
): QualityScoreResult {
  const { distinctHosts, effectiveReceipts } = l1HostStats(receipts)
  const medianConf = medianConfidence(receipts)
  const l1r = l1Ratio(receipts)
  const evDiv = eventDiversity(receipts)
  const rec = recency(receipts)

  const base = { distinctHosts, medianConf, l1Ratio: l1r, eventDiversity: evDiv, recency: rec }

  // Principle 6 — minimum-threshold gate.
  if (effectiveReceipts < THRESHOLD_MIN_RECEIPTS && distinctHosts < THRESHOLD_MIN_HOSTS) {
    return { score: null, ranked: false, ...base }
  }

  let raw =
    WEIGHTS.w1 * Math.log2(1 + distinctHosts) +     // (1) breadth, log-scaled
    WEIGHTS.w2 * (medianConf * 100) +                // (2) consistency, median not avg
    WEIGHTS.w3 * (l1r * 100) +                       // (3) reachability ratio
    WEIGHTS.w4 * Math.log2(1 + evDiv) +              // (4) event-type diversity, log-scaled
    WEIGHTS.w5 * rec                                 // (5) recency decay

  if (opts.featured) raw += FEATURED_BOOST           // D7 — featured boost within tier

  const score = Math.min(100, Math.round(raw))
  return { score, ranked: true, ...base }
}
