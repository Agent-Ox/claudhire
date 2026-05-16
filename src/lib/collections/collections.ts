/**
 * Collections layer — slugs-as-data.
 *
 * A collection exists because a row exists in `public.collections`.
 * No enum, no allowlist, no hardcoded slug — every function takes
 * `slug: string` as a parameter and resolves the row dynamically.
 *
 * Spec: docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md §0 ("collections
 * are data, never code").
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { CollectionGateError, type CollectionRow } from './context.ts'

/**
 * Fetch one collection by slug. Returns null when no row exists.
 * Caller may treat null + inactive as 404 (use requireActiveCollection
 * for the strict-gate path).
 */
export async function getCollection(
  db: SupabaseClient,
  slug: string,
): Promise<CollectionRow | null> {
  const { data, error } = await db
    .from('collections')
    .select('slug, title, description, created_at, active')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(`collections.getCollection(${slug}): ${error.message}`)
  return (data as CollectionRow | null) ?? null
}

/**
 * List every active collection, ordered by created_at. Drives the
 * per-collection card loop on the dashboard. Returns [] when zero
 * active collections exist (the empty-platform state — dashboard
 * renders no cards).
 */
export async function listActiveCollections(
  db: SupabaseClient,
): Promise<CollectionRow[]> {
  const { data, error } = await db
    .from('collections')
    .select('slug, title, description, created_at, active')
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`collections.listActiveCollections: ${error.message}`)
  return (data as CollectionRow[] | null) ?? []
}

/**
 * Strict gate: returns the row OR throws CollectionGateError.
 * Used by every read/mutation path that requires a live collection.
 *
 *   throws code='unknown_slug' when no row exists
 *   throws code='inactive'      when row exists but active=false
 */
export async function requireActiveCollection(
  db: SupabaseClient,
  slug: string,
): Promise<CollectionRow> {
  const row = await getCollection(db, slug)
  if (!row) throw new CollectionGateError('unknown_slug', `collection '${slug}' does not exist`)
  if (!row.active) throw new CollectionGateError('inactive', `collection '${slug}' is not active`)
  return row
}

/**
 * Slug format validator. Used by admin-side create-collection script
 * to reject bad slugs at the source. Lowercase, hyphen-separated,
 * 1–64 chars, no leading/trailing hyphen, no consecutive hyphens.
 */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== 'string') return false
  if (slug.length < 1 || slug.length > 64) return false
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}
