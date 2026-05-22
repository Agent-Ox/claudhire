/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ShipStacked Proof Receipt Schema v0.1
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CORE PRINCIPLE
 *
 *   A ShipStacked profile is not the product.
 *   A profile is an index of proof receipts.
 *
 * The proof receipt is the atomic primitive of ShipStacked.
 * Everything else — profiles, capability graphs, trust scores, rankings,
 * economic memory, routing — is derived aggregation over proof receipts.
 *
 * CONSTITUTIONAL CONSTRAINT
 *
 *   Every monetizable interaction must strengthen the graph.
 *
 * STATUS
 *
 *   v0.1 — One migration allowed before lock. Bump schema_version on any
 *   breaking change. Bump atlas_version when the Atlas role taxonomy changes.
 *
 * Author: ShipStacked
 * Date:   2026-05-15
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema version. Bump on any breaking change to ProofReceipt.
 * One migration (v0.1 → v0.2) is allowed before locking the shape.
 */
export const SchemaVersion = z.literal('0.1');

/**
 * Atlas taxonomy version. Bump when Atlas role IDs change meaning or split.
 * Receipts retain the version they were classified under so we can migrate
 * deterministically.
 *
 * v0.4 is the active taxonomy (live in production).
 * v0.3 retained for historical receipts.
 */
export const AtlasVersion = z.enum(['v0.3', 'v0.4']);
export const ATLAS_VERSION_DEFAULT = 'v0.4' as const;

/**
 * Event type. PHASE 1A taxonomy — deliberately narrow.
 * Do NOT expand without real-receipt evidence demanding it.
 * Subtypes go in `event_subtype` as free text; we harvest them for v0.2.
 */
export const EventType = z.enum([
  'shipped_app',
  'shipped_site',
  'shipped_agent',
  'shipped_workflow',
  'shipped_integration',
  'deployed_mcp_server',
  'published_repo',
  'completed_eval',
  'delivered_engagement',
  'resolved_incident',
]);
export type EventType = z.infer<typeof EventType>;

/**
 * Verification ladder. Visible on every receipt page — this is trust UX.
 * Append-only verification_log records the path up the ladder.
 */
export const VerificationLevel = z.enum([
  'L0_claimed',                  // user pasted it, nothing verified
  'L1_artifact_confirmed',       // URL fetched, status 200, metadata extracted
  'L2_technically_checked',      // code analyzed, deployment pinged, eval reproduced
  'L3_externally_attested',      // named client/employer/peer signed off
  'L4_cryptographically_signed', // DID/VC verifiable credential
]);
export type VerificationLevel = z.infer<typeof VerificationLevel>;

/**
 * Source channel — how this receipt entered ShipStacked.
 * Read these analytics to know which channels deserve investment.
 */
export const IngestionSource = z.enum([
  'paste',                       // /paste flow — PRIMARY in Phase 1A
  'github_sync',                 // future: GitHub App watches public repos
  'mcp_post_proof',              // MCP server, agent-posted
  'api',                         // direct API key usage
  'import_bulk',                 // future
  'third_party_webhook',         // future
]);
export type IngestionSource = z.infer<typeof IngestionSource>;

/**
 * Entity kind. Phase 1A populates only `human`; other kinds reserved for
 * future flows.
 */
export const EntityKind = z.enum(['human', 'operator', 'fleet', 'agent']);

export const EntityRef = z.object({
  id: z.string().regex(/^shipstacked:entity:[0-9A-HJKMNP-TV-Z]{26}$/),
  kind: EntityKind,
  display_name: z.string().min(1).max(120),
  canonical_url: z.string().url(),
});
export type EntityRef = z.infer<typeof EntityRef>;

// ─────────────────────────────────────────────────────────────────────────────
// ARTIFACTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An Artifact is evidence attached to a proof receipt.
 * The receipt is the event. The artifacts are the proof of the event.
 * A single receipt can have multiple artifacts (repo + deploy + walkthrough).
 */
export const ArtifactKind = z.enum([
  'url',
  'repo',
  'deployment',
  'screenshot',
  'video',
  'doc',
  'diagram',
]);

export const Artifact = z.object({
  kind: ArtifactKind,
  url: z.string().url(),
  title: z.string().max(160).optional(),
  description: z.string().max(500).optional(),
  fetched_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type Artifact = z.infer<typeof Artifact>;

// ─────────────────────────────────────────────────────────────────────────────
// ATLAS ROLE ASSIGNMENT — the critical multi-source field
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atlas role IDs are canonical from day one.
 * Format: cluster letter + integer. A1, A4, B2, F1, F3, C2, G1, G3, etc.
 * Every Atlas role dereferences to https://shipstacked.com/atlas/roles/{ID}
 * as JSON-LD. This is the standards play.
 *
 * Cluster status (live as of Atlas v0.4):
 *   A–F  : Active (Atlas v0.3 + v0.4)
 *   G    : Active (Atlas v0.4 — domain-practitioner-with-integrated-AI)
 *   H+   : Reserved for future versions; expansion requires AtlasRoleId
 *          regex update and schema_version bump
 */
export const AtlasRoleId = z.string().regex(/^[A-G][0-9]{1,2}$/);

/**
 * Atlas classification is never a single field.
 * It is the layered output of: user claim, AI inference, user confirmation.
 *
 *   claimed     — what the user explicitly stated they did
 *   inferred    — what the AI classifier deduced from the artifact
 *   confirmed   — roles the user reviewed and confirmed (the trust signal)
 *   confidence_score — classifier confidence in inferred[], 0.0–1.0
 *
 * Trust UX: a receipt where claimed == confirmed == inferred is high-trust.
 * A receipt where the user ignored a classifier disagreement is lower-trust.
 * We can rank on this. We probably will.
 */
export const AtlasRoleAssignment = z.object({
  claimed: z.array(AtlasRoleId),
  inferred: z.array(AtlasRoleId),
  confirmed: z.array(AtlasRoleId),
  confidence_score: z.number().min(0).max(1),
  classifier_version: z.string(),     // e.g. "claude-classifier-v0.1.3"
  classified_at: z.string().datetime(),
});
export type AtlasRoleAssignment = z.infer<typeof AtlasRoleAssignment>;

// ─────────────────────────────────────────────────────────────────────────────
// STACK & OUTCOMES
// ─────────────────────────────────────────────────────────────────────────────

export const StackCategory = z.enum([
  'model',
  'framework',
  'infra',
  'tool',
  'language',
  'service',
]);

export const StackElement = z.object({
  name: z.string().min(1).max(80),
  category: StackCategory,
  version: z.string().max(40).optional(),
  role: z.enum(['primary', 'secondary', 'supporting']),
});
export type StackElement = z.infer<typeof StackElement>;

export const OutcomeKind = z.enum([
  'revenue',
  'cost_reduction',
  'time_saved',
  'performance',
  'uptime',
  'users',
  'compliance',
  'qualitative',
]);

/**
 * Outcomes are self-asserted unless `verified: true` (requires L3 attestation
 * or external evidence). Schema cost is trivial; future value is large when
 * compliance/regulated buyers query the graph.
 */
export const Outcome = z.object({
  kind: OutcomeKind,
  value: z.number().optional(),
  unit: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  verified: z.boolean().default(false),
});
export type Outcome = z.infer<typeof Outcome>;

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append-only log of verification ladder transitions.
 * Each row is a verification event with method + evidence.
 * Becomes the audit trail for L3/L4 compliance/regulated use cases.
 */
export const VerificationEvent = z.object({
  level: VerificationLevel,
  achieved_at: z.string().datetime(),
  method: z.string().max(80),            // "url_fetch", "github_api", "client_signature", "did_web"
  evidence: z.record(z.unknown()).optional(),
});
export type VerificationEvent = z.infer<typeof VerificationEvent>;

// Enum value 'employer' kept for storage stability — destructive
// migration would invalidate existing rows under the CHECK constraint.
// No attestations rows exist today; when writes start, the new value
// can be added additively in the same commit. Display copy maps this
// value to 'Hirer' at render time.
export const AttestorRole = z.enum(['client', 'employer', 'peer', 'platform']);

export const Attestation = z.object({
  attestor: EntityRef,
  attestor_role: AttestorRole,
  statement: z.string().min(1).max(500),
  signed_at: z.string().datetime(),
  signature: z.string().optional(),               // L4 only
  signature_method: z.string().optional(),        // e.g. "did:web", "did:key"
});
export type Attestation = z.infer<typeof Attestation>;

// ─────────────────────────────────────────────────────────────────────────────
// THE PROOF RECEIPT
// ─────────────────────────────────────────────────────────────────────────────

export const ProofReceipt = z.object({
  // ── Schema ─────────────────────────────────────────────────────────────
  schema_version: SchemaVersion,
  atlas_version: AtlasVersion,        // defaults to v0.4 for new receipts

  // ── Identity ───────────────────────────────────────────────────────────
  id: z.string().regex(/^shipstacked:proof:[0-9A-HJKMNP-TV-Z]{26}$/),
  canonical_url: z.string().url(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,80}$/),
  issued_at: z.string().datetime(),
  updated_at: z.string().datetime(),

  // ── Subject ────────────────────────────────────────────────────────────
  subject: EntityRef,
  on_behalf_of: EntityRef.optional(),

  // ── Event ──────────────────────────────────────────────────────────────
  event_type: EventType,
  event_subtype: z.string().max(80).optional(),  // free text, harvested for v0.2
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),      // markdown
  occurred_at: z.string().datetime(),            // when the work happened
  occurred_at_precision: z.enum(['day', 'month', 'quarter', 'year']),
  duration_seconds: z.number().int().positive().optional(),

  // ── Artifacts ──────────────────────────────────────────────────────────
  artifacts: z.array(Artifact).min(1),           // minimum 1, no receipt without proof

  // ── Capabilities ───────────────────────────────────────────────────────
  atlas_roles: AtlasRoleAssignment,
  capabilities: z.array(z.string().max(60)),     // controlled vocab tags, harvested
  stack: z.array(StackElement),

  // ── Outcomes ───────────────────────────────────────────────────────────
  outcomes: z.array(Outcome),

  // ── Verification ───────────────────────────────────────────────────────
  verification: VerificationLevel,               // current level
  verification_log: z.array(VerificationEvent),  // append-only audit trail
  attestations: z.array(Attestation),            // L3+ third-party signatures

  // ── Distribution ───────────────────────────────────────────────────────
  visibility: z.enum(['public', 'unlisted', 'private']),
  embed_card_url: z.string().url(),              // OG image, auto-generated
  jsonld_url: z.string().url(),                  // schema.org JSON-LD endpoint

  // ── Provenance ─────────────────────────────────────────────────────────
  ingestion_source: IngestionSource,
  ingestion_metadata: z.record(z.unknown()),
});

export type ProofReceipt = z.infer<typeof ProofReceipt>;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / UPDATE INPUT SHAPES (what /api/paste/publish accepts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What the paste-flow submits when publishing.
 * The server fills in: id, canonical_url, slug, issued_at, updated_at,
 * embed_card_url, jsonld_url, verification_log (initial L1 event).
 */
export const CreateProofReceiptInput = ProofReceipt.omit({
  id: true,
  canonical_url: true,
  slug: true,
  issued_at: true,
  updated_at: true,
  embed_card_url: true,
  jsonld_url: true,
  verification_log: true,
});
export type CreateProofReceiptInput = z.infer<typeof CreateProofReceiptInput>;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA.ORG JSON-LD PROJECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public JSON-LD representation served at /p/{slug}.json or via content
 * negotiation on /p/{slug} with Accept: application/ld+json.
 *
 * Maps ProofReceipt → schema.org CreativeWork + custom shipstacked: namespace.
 * This is what recruiter agents, LLM training data ingestors, and search
 * engines consume.
 */
export interface ProofReceiptJsonLd {
  '@context': [
    'https://schema.org',
    { shipstacked: 'https://shipstacked.com/schema/v0.1#' }
  ];
  '@type': ['CreativeWork', 'shipstacked:ProofReceipt'];
  '@id': string;                                 // canonical URL
  identifier: string;                            // shipstacked:proof:<ulid>
  name: string;                                  // title
  description: string;
  dateCreated: string;                           // issued_at
  dateModified: string;                          // updated_at
  temporalCoverage: string;                      // occurred_at

  author: {
    '@type': 'Person' | 'Organization';
    '@id': string;
    name: string;
  };

  'shipstacked:eventType': EventType;
  'shipstacked:atlasRoles': Array<{
    '@id': string;                               // /atlas/roles/A1 — dereferenceable
    'shipstacked:roleId': string;
    'shipstacked:source': 'claimed' | 'inferred' | 'confirmed';
  }>;
  'shipstacked:verificationLevel': VerificationLevel;
  'shipstacked:atlasVersion': string;

  workExample: Array<{
    '@type': 'CreativeWork' | 'SoftwareSourceCode' | 'WebSite';
    url: string;
    name?: string;
  }>;

  'shipstacked:attestations'?: Array<{
    '@type': 'shipstacked:Attestation';
    'shipstacked:attestorRole': string;
    'shipstacked:statement': string;
    'shipstacked:signedAt': string;
  }>;

  'shipstacked:verificationTrail'?: Array<{
    '@type': 'shipstacked:VerificationEvent';
    'shipstacked:level': string;
    'shipstacked:method': string;
    'shipstacked:achievedAt': string;
    'shipstacked:evidence': Record<string, unknown>;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — keep in sync with /atlas pages
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_HOST = 'https://shipstacked.com';
export const ATLAS_ROLE_BASE = `${CANONICAL_HOST}/atlas/roles`;
export const PROOF_BASE = `${CANONICAL_HOST}/p`;
export const ENTITY_BASE = `${CANONICAL_HOST}/u`;
export const SCHEMA_NAMESPACE = `${CANONICAL_HOST}/schema/v0.1#`;

/**
 * Build the canonical Atlas role URL.
 * Used both internally (linking) and in JSON-LD (dereferenceable @id).
 * Defaults to v0.4 (current live Atlas).
 */
export function atlasRoleUrl(roleId: string, version: string = 'v0.4'): string {
  return `${ATLAS_ROLE_BASE}/${roleId}?v=${version}`;
}

/**
 * Build the canonical receipt URL from a slug.
 */
export function proofUrl(slug: string): string {
  return `${PROOF_BASE}/${slug}`;
}
