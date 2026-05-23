/**
 * Publish core — turns a user-edited PasteDraft into a committed
 * proof_receipt row + verification_events + ingestion_log + (best-effort)
 * OG card and capabilities_vocab counter bumps.
 *
 * Spec: docs/v2/STEP_6_PUBLISH_API_SPEC.md §3.
 *
 * Transaction handling: Supabase JS doesn't expose Postgres transactions
 * cleanly across multiple table writes, so we do sequential service-role
 * inserts with compensating deletes if a mid-flight write fails. The
 * cleanup target is the just-created receipt (cascades verification_events
 * via FK on delete cascade) and the just-created entity (only if THIS
 * publish created it). Flagged as a deviation from the spec's "single
 * transaction" preference.
 */

import { z } from 'zod'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { proofExternalId } from '../ulid.ts'
import { generateUniqueSlug, normalizeSlug } from './slug.ts'
import { findOrCreateHumanEntity, deleteEntity, type EntityRow } from '../entities.ts'
import { getAtlasRoles } from '../../services/atlas-classifier/roles.ts'
import { deleteDraft } from './draft.ts'

const CANONICAL_HOST = 'https://shipstacked.com'

function receiptOgUrl(slug: string): string {
  return `${CANONICAL_HOST}/og?type=receipt&slug=${encodeURIComponent(slug)}`
}

// ─── Spec §2.1 PasteDraft (what the client posts; user-edited shape) ────

const ArtifactSchema = z.object({
  kind: z.enum(['url', 'repo', 'deployment', 'screenshot', 'video', 'doc', 'diagram']),
  url: z.string().url(),
  title: z.string().max(160).optional(),
  description: z.string().max(500).optional(),
  fetched_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const StackElementSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(['model', 'framework', 'infra', 'tool', 'language', 'service']),
  version: z.string().max(40).optional(),
  role: z.enum(['primary', 'secondary', 'supporting']),
})

const OutcomeSchema = z.object({
  kind: z.enum([
    'revenue', 'cost_reduction', 'time_saved', 'performance',
    'uptime', 'users', 'compliance', 'qualitative',
  ]),
  value: z.number().optional(),
  unit: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  verified: z.boolean().default(false),
})

const EventTypeEnum = z.enum([
  'shipped_app', 'shipped_site', 'shipped_agent', 'shipped_workflow',
  'shipped_integration', 'deployed_mcp_server', 'published_repo',
  'completed_eval', 'delivered_engagement', 'resolved_incident',
])

const SourceEnum = z.enum([
  'github', 'lovable', 'bolt', 'v0', 'replit',
  'vercel', 'netlify', 'mcp_server', 'generic',
])

export const PasteDraftSchema = z.object({
  url: z.string().url(),
  source: SourceEnum,
  event_type: EventTypeEnum,
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  occurred_at: z.string().datetime(),
  occurred_at_precision: z.enum(['day', 'month', 'quarter', 'year']),
  artifacts: z.array(ArtifactSchema).min(1),
  stack: z.array(StackElementSchema),
  outcomes: z.array(OutcomeSchema),
  capabilities: z.array(z.string().max(60)),
  atlas_roles_confirmed: z.array(z.string()),
  atlas_roles_claimed: z.array(z.string()),
  atlas_roles_inferred: z.array(z.string()),
  atlas_confidence: z.number().min(0).max(1),
  classifier_version: z.string(),
  classifier_reasoning: z.string(),
  visibility: z.enum(['public', 'unlisted']),
  wanted_attestation: z.boolean(),
  // Optional flags forwarded from the analyzer; used for §3.6 verification
  // level resolution. Defaults preserve the conservative L1-with-artifact rule.
  classifier_reachable: z.boolean().optional(),
  // Batch 5: optional per-receipt idempotency key. SHA256 of
  // (subject_id|normalized_artifact_url|event_type). When set, persisted to
  // proof_receipts.dedupe_key (unique partial index — duplicate writes are
  // detected as PublishDuplicate result instead of a regular insert error).
  dedupe_key: z.string().optional(),
})

export type PasteDraft = z.infer<typeof PasteDraftSchema>

// ─── Result types ────────────────────────────────────────────────────────

export interface PublishSuccess {
  success: true
  id: string                       // shipstacked:proof:<ulid>
  receipt_db_id: number
  slug: string
  canonical_url: string
  entity_canonical_url: string
  verification_level: 'L0_claimed' | 'L1_artifact_confirmed'
}

export interface PublishFailure {
  success: false
  error: 'invalid_draft' | 'server_error'
  message: string
}

// Batch 5: distinguishes "we tried to insert but the dedupe_key already
// exists" from a generic server error. Callers (the enrichment adapter)
// treat this as success-with-zero-rows, not failure.
export interface PublishDuplicate {
  success: false
  error: 'duplicate'
  message: string
  dedupe_key: string
}

export type PublishResult = PublishSuccess | PublishFailure | PublishDuplicate

// ─── Helpers ─────────────────────────────────────────────────────────────

function filterAtlasRoles(roles: string[]): { kept: string[]; dropped: string[] } {
  const validIds = new Set(getAtlasRoles().map((r) => r.id))
  const kept: string[] = []
  const dropped: string[] = []
  for (const r of roles) {
    if (validIds.has(r)) {
      if (!kept.includes(r)) kept.push(r)
    } else {
      dropped.push(r)
    }
  }
  return { kept, dropped }
}

function resolveVerificationLevel(draft: PasteDraft): 'L0_claimed' | 'L1_artifact_confirmed' {
  // §3.6 — L1 when the source was reachable AND ≥1 artifact is present.
  // classifier_reachable is the authoritative flag from Step 2; in the
  // common path the review form forwards it. Fall back to the heuristic
  // (artifacts present + non-trivial description) when the flag is absent.
  if (draft.artifacts.length === 0) return 'L0_claimed'
  if (typeof draft.classifier_reachable === 'boolean') {
    return draft.classifier_reachable ? 'L1_artifact_confirmed' : 'L0_claimed'
  }
  if (draft.description.trim().length > 0) return 'L1_artifact_confirmed'
  return 'L0_claimed'
}

function entityCanonicalUrl(slug: string): string {
  return `${CANONICAL_HOST}/u/${slug}`
}

function receiptCanonicalUrl(slug: string): string {
  return `${CANONICAL_HOST}/p/${slug}`
}

// ─── Main entry point ────────────────────────────────────────────────────

export interface PublishInput {
  admin: SupabaseClient
  user: User
  draft: PasteDraft
  draftId?: string
  requestId?: string
}

export async function publishProofReceipt(input: PublishInput): Promise<PublishResult> {
  const { admin, user, draft, draftId, requestId } = input

  // Atlas role validation: drop unknowns silently with a warning log.
  const confirmed = filterAtlasRoles(draft.atlas_roles_confirmed)
  const claimed = filterAtlasRoles(draft.atlas_roles_claimed)
  const inferred = filterAtlasRoles(draft.atlas_roles_inferred)
  for (const dropped of [...confirmed.dropped, ...claimed.dropped, ...inferred.dropped]) {
    console.warn(`[publish] dropped unknown atlas role: ${dropped}`)
  }

  // 1. Subject entity (find or create). Track creation so we can roll back.
  let entityResult: { entity: EntityRow; was_created: boolean }
  try {
    entityResult = await findOrCreateHumanEntity(admin, user)
  } catch (e) {
    return {
      success: false,
      error: 'server_error',
      message: e instanceof Error ? e.message : 'entity resolution failed',
    }
  }
  const { entity, was_created: entityWasCreated } = entityResult

  async function cleanupEntity() {
    if (entityWasCreated) {
      try { await deleteEntity(admin, entity.id) } catch {}
    }
  }

  // 2. Generate receipt slug + ULID
  let slug: string
  try {
    slug = await generateUniqueSlug(admin, 'proof_receipts', draft.title)
  } catch (e) {
    await cleanupEntity()
    return {
      success: false,
      error: 'server_error',
      message: e instanceof Error ? e.message : 'slug generation failed',
    }
  }

  const externalId = proofExternalId()
  const now = new Date().toISOString()
  const verificationLevel = resolveVerificationLevel(draft)

  // 3. Insert proof_receipt. Retry up to 5x on slug uniqueness race.
  let receiptDbId: number | null = null
  let receiptSlug = slug
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = {
      external_id: externalId,
      slug: receiptSlug,
      schema_version: '0.1',
      atlas_version: 'v0.4',
      subject_id: entity.id,
      on_behalf_of_id: null,
      event_type: draft.event_type,
      event_subtype: null,
      title: draft.title,
      description: draft.description,
      occurred_at: draft.occurred_at,
      occurred_at_precision: draft.occurred_at_precision,
      duration_seconds: null,
      artifacts: draft.artifacts,
      stack: draft.stack,
      outcomes: draft.outcomes,
      capabilities: draft.capabilities,
      atlas_claimed: claimed.kept,
      atlas_inferred: inferred.kept,
      atlas_confirmed: confirmed.kept,
      atlas_confidence: draft.atlas_confidence,
      classifier_version: draft.classifier_version,
      classified_at: now,
      verification_level: verificationLevel,
      visibility: draft.visibility,
      ingestion_source: 'paste',
      ingestion_metadata: {
        classifier_reasoning: draft.classifier_reasoning,
        wanted_attestation: draft.wanted_attestation,
        source: draft.source,
        url: draft.url,
      },
      issued_at: now,
      updated_at: now,
      // Batch 5: dedupe_key when set is unique partial-indexed; collision
      // means "this exact (subject, artifact, event_type) has been
      // published before" and is handled as PublishDuplicate below.
      dedupe_key: draft.dedupe_key ?? null,
    }
    const { data: inserted, error } = await admin
      .from('proof_receipts')
      .insert(row)
      .select('id, slug')
      .single()
    if (!error && inserted) {
      receiptDbId = inserted.id as number
      receiptSlug = inserted.slug as string
      break
    }
    if (error?.code === '23505' && /dedupe/i.test(error.message ?? '')) {
      // Dedupe race — this (subject, artifact, event_type) has already
      // been published. Roll back the entity-creation guard and return a
      // duplicate result so the adapter can treat it as a no-op rather
      // than a failure.
      //
      // Match the constraint NAME (idx_receipts_dedupe) — Postgres
      // reports the index/constraint name in the error message, not the
      // column name. The /dedupe/ pattern matches "idx_receipts_dedupe"
      // and any future dedupe-named indexes.
      await cleanupEntity()
      return {
        success: false,
        error: 'duplicate',
        message: `proof_receipt with dedupe_key already exists`,
        dedupe_key: draft.dedupe_key!,
      }
    }
    if (error?.code === '23505' && /slug/.test(error.message ?? '')) {
      // Slug race — regenerate and retry.
      try {
        receiptSlug = await generateUniqueSlug(admin, 'proof_receipts', draft.title)
        continue
      } catch (e) {
        await cleanupEntity()
        return {
          success: false,
          error: 'server_error',
          message: e instanceof Error ? e.message : 'slug regeneration failed',
        }
      }
    }
    await cleanupEntity()
    return {
      success: false,
      error: 'server_error',
      message: `receipt insert failed: ${error?.message ?? 'unknown'}`,
    }
  }

  if (receiptDbId == null) {
    await cleanupEntity()
    return {
      success: false,
      error: 'server_error',
      message: 'receipt insert exhausted retries (slug collision)',
    }
  }

  async function cleanupReceipt() {
    if (receiptDbId != null) {
      try { await admin.from('proof_receipts').delete().eq('id', receiptDbId) } catch {}
    }
    await cleanupEntity()
  }

  // 4. Insert verification_event
  const verEventInsert = await admin.from('verification_events').insert({
    receipt_id: receiptDbId,
    level: verificationLevel,
    achieved_at: now,
    method: 'paste_flow_ingest',
    evidence: {
      classifier_source: draft.source,
      classifier_reachable: draft.classifier_reachable ?? null,
      analyzer_artifacts_count: draft.artifacts.length,
      classifier_confidence: draft.atlas_confidence,
    },
  })
  if (verEventInsert.error) {
    await cleanupReceipt()
    return {
      success: false,
      error: 'server_error',
      message: `verification_events insert failed: ${verEventInsert.error.message}`,
    }
  }

  // 5. Insert ingestion_log
  const ingLogInsert = await admin.from('ingestion_log').insert({
    receipt_id: receiptDbId,
    source: 'paste',
    source_url: draft.url,
    request_id: requestId ?? null,
    status: 'published',
    error: null,
  })
  if (ingLogInsert.error) {
    await cleanupReceipt()
    return {
      success: false,
      error: 'server_error',
      message: `ingestion_log insert failed: ${ingLogInsert.error.message}`,
    }
  }

  // ─── Best-effort, non-critical post-write steps ──────────────────────
  // From here on, failures are logged but do NOT roll back the receipt.

  // 6. capabilities_vocab counter bumps. Select-then-update/insert because
  // supabase-js can't express "ON CONFLICT DO UPDATE SET count = count + 1"
  // without a custom RPC. Race-tolerant enough for analytics counters; a
  // small under-count under heavy concurrency is acceptable.
  for (const tag of draft.capabilities) {
    try {
      const { data: existing } = await admin
        .from('capabilities_vocab')
        .select('tag, receipt_count')
        .eq('tag', tag)
        .maybeSingle()
      if (existing) {
        await admin
          .from('capabilities_vocab')
          .update({ receipt_count: (existing.receipt_count as number) + 1 })
          .eq('tag', tag)
      } else {
        await admin
          .from('capabilities_vocab')
          .insert({ tag, receipt_count: 1, promoted: false })
      }
    } catch (e) {
      console.warn(`[publish] capabilities_vocab bump for tag=${tag} failed:`, e)
    }
  }

  // 7. embed_card_url — point at the on-demand /og endpoint for this slug.
  // No pre-rendered PNG: cards regenerate on each request, always reflect
  // current data, and we skip the Supabase Storage write entirely. Spec
  // §3.8 deviation flagged in the report.
  try {
    await admin
      .from('proof_receipts')
      .update({
        ingestion_metadata: {
          classifier_reasoning: draft.classifier_reasoning,
          wanted_attestation: draft.wanted_attestation,
          source: draft.source,
          url: draft.url,
          embed_card_url: receiptOgUrl(receiptSlug),
        },
      })
      .eq('id', receiptDbId)
  } catch (e) {
    console.warn('[publish] embed_card_url update failed:', e)
  }

  // 8. Delete the Redis draft if we have an id (best-effort).
  if (draftId) {
    try { await deleteDraft(draftId) } catch {}
  }

  return {
    success: true,
    id: externalId,
    receipt_db_id: receiptDbId,
    slug: receiptSlug,
    canonical_url: receiptCanonicalUrl(receiptSlug),
    entity_canonical_url: entityCanonicalUrl(entity.slug),
    verification_level: verificationLevel,
  }
}

// Re-export for verification-script convenience.
export { normalizeSlug }
