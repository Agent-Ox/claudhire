/**
 * Receipt fetcher — the single read path for /p/[slug] (HTML and JSON-LD).
 *
 * Uses the service-role client so unlisted receipts still render at their
 * canonical URL (the URL itself is the capability token for unlisted —
 * indexing is gated separately via the noindex meta tag). Private
 * receipts are gated in the page render: the route still reads them, but
 * renders 404 unless the requesting user is the subject's owner.
 *
 * Spec: docs/v2/STEP_7_PUBLIC_PAGES_SPEC.md §3.5.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const CANONICAL_HOST = 'https://shipstacked.com'

export interface ReceiptSubject {
  id: number
  display_name: string
  slug: string
  owner_user_id: string | null
}

export interface AttestationRow {
  id: number
  attestor_role: string
  statement: string
  signed_at: string
}

export interface VerificationEventRow {
  level: string
  method: string
  achieved_at: string
  evidence: Record<string, unknown>
}

export interface ReceiptRow {
  id: number
  external_id: string
  slug: string
  schema_version: string
  atlas_version: string
  subject_id: number
  on_behalf_of_id: number | null
  event_type: string
  event_subtype: string | null
  title: string
  description: string
  occurred_at: string
  occurred_at_precision: string
  duration_seconds: number | null
  artifacts: Array<{ kind: string; url: string; title?: string; description?: string }>
  stack: Array<{ name: string; category: string; version?: string; role: string }>
  outcomes: Array<{ kind: string; value?: number; unit?: string; description: string; verified: boolean }>
  capabilities: string[]
  atlas_claimed: string[]
  atlas_inferred: string[]
  atlas_confirmed: string[]
  atlas_confidence: number
  classifier_version: string
  classified_at: string
  verification_level: string
  visibility: 'public' | 'unlisted' | 'private'
  ingestion_source: string
  ingestion_metadata: Record<string, unknown>
  issued_at: string
  updated_at: string
}

export interface ReceiptBundle {
  receipt: ReceiptRow
  subject: ReceiptSubject
  attestations: AttestationRow[]
  verification_events: VerificationEventRow[]
}

export function receiptCanonicalUrl(slug: string): string {
  return `${CANONICAL_HOST}/p/${slug}`
}

export function entityCanonicalUrl(slug: string): string {
  return `${CANONICAL_HOST}/u/${slug}`
}

export async function getReceiptBundle(
  admin: SupabaseClient,
  slug: string,
): Promise<ReceiptBundle | null> {
  const { data: receipt } = await admin
    .from('proof_receipts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (!receipt) return null
  const receiptRow = receipt as ReceiptRow

  const { data: subject } = await admin
    .from('entities')
    .select('id, display_name, slug, owner_user_id')
    .eq('id', receiptRow.subject_id)
    .maybeSingle()
  if (!subject) return null

  // Attestations + verification_events are append-only public reads in
  // §3.2 RLS; service role bypasses anyway.
  const { data: attestations } = await admin
    .from('attestations')
    .select('id, attestor_role, statement, signed_at')
    .eq('receipt_id', receiptRow.id)
    .order('signed_at', { ascending: false })

  const { data: verEvents } = await admin
    .from('verification_events')
    .select('level, method, achieved_at, evidence')
    .eq('receipt_id', receiptRow.id)
    .order('achieved_at', { ascending: true })

  return {
    receipt: receiptRow,
    subject: subject as ReceiptSubject,
    attestations: (attestations as AttestationRow[]) ?? [],
    verification_events: (verEvents as VerificationEventRow[]) ?? [],
  }
}

/**
 * Most recent N public receipts for the dynamic /llms.txt + future feeds.
 */
export async function getRecentPublicReceipts(
  admin: SupabaseClient,
  limit = 20,
): Promise<Array<{ slug: string; title: string; issued_at: string }>> {
  const { data } = await admin
    .from('proof_receipts')
    .select('slug, title, issued_at')
    .eq('visibility', 'public')
    .order('issued_at', { ascending: false })
    .limit(limit)
  return (data as Array<{ slug: string; title: string; issued_at: string }>) ?? []
}
