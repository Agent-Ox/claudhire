/**
 * Shared types + constants for the consented-collections module.
 *
 * IMPORTANT: there are NO collection-slug constants in this module
 * by design. Collections are DATA — a row in `public.collections`
 * defines what exists. Every function in this module takes `slug:
 * string` as a parameter. Creating a new collection happens via
 * scripts/v2/create-collection.ts (which inserts a row); the code
 * never knows or cares what any collection is for.
 *
 * Spec:      docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md
 * Discovery: docs/audit/GATEWAY_DISCOVERY.md (revised — §A §B §F §H)
 */

import { CANONICAL_HOST } from '../jsonld/context.ts'

export { CANONICAL_HOST }

/** URL helper — the canonical URL of any collection by slug. */
export function collectionUrl(slug: string): string {
  return `${CANONICAL_HOST}/collections/${slug}`
}

/** URL helper — the token redemption URL for a collection. */
export function collectionOptinUrl(slug: string, token: string): string {
  return `${CANONICAL_HOST}/collections/${slug}/optin?t=${token}`
}

/** Source of a consent record — written into collection_memberships.source. */
export type ConsentSource = 'dashboard' | 'link'

/** Shape of a collection row as read from the DB. */
export interface CollectionRow {
  slug: string
  title: string
  description: string | null
  created_at: string
  active: boolean
}

/** Shape of an active membership for a profile (opted_out_at IS NULL). */
export interface MembershipRow {
  id: number
  profile_id: string
  collection_slug: string
  opted_in_at: string
  opted_out_at: string | null
  source: ConsentSource
}

/**
 * Error thrown by requireActiveCollection / requirePublishedProfile
 * when a gate fails. The route handlers catch and translate to HTTP.
 */
export type CollectionGateCode = 'unknown_slug' | 'inactive' | 'unpublished_profile' | 'fake_profile'

export class CollectionGateError extends Error {
  public code: CollectionGateCode
  constructor(code: CollectionGateCode, message: string) {
    super(message)
    this.name = 'CollectionGateError'
    this.code = code
  }
}
