/**
 * Consent layer — per-builder opt-in/opt-out per collection.
 *
 * Every function takes (profile_id, slug) — slug is always a parameter.
 *
 * Membership lifecycle:
 *   - optIn writes a NEW row with opted_out_at=NULL. If an active
 *     membership already exists, no-op (idempotent).
 *   - optOut sets opted_out_at on the active row. Does NOT delete —
 *     consent history is preserved.
 *   - re-opt-in after an opt-out writes a new row, so history can
 *     show multiple consent cycles for the same (profile, slug).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { CollectionGateError, type ConsentSource, type MembershipRow } from './context.ts'
import { requireActiveCollection } from './collections.ts'

/**
 * Profile-side gate: the profile must exist AND be published.
 * Mirrors the universal published=true filter that Tier 1 and
 * Beacon 1 H9a established.
 */
async function requirePublishedProfile(
  db: SupabaseClient,
  profile_id: string,
): Promise<{ id: string; published: boolean; username: string; full_name: string | null }> {
  const { data, error } = await db
    .from('profiles')
    .select('id, published, username, full_name')
    .eq('id', profile_id)
    .maybeSingle()
  if (error) throw new Error(`consent.requirePublishedProfile: ${error.message}`)
  if (!data) throw new CollectionGateError('unpublished_profile', `profile ${profile_id} does not exist`)
  if (!data.published) throw new CollectionGateError('unpublished_profile', `profile ${profile_id} is not published`)
  return data as { id: string; published: boolean; username: string; full_name: string | null }
}

/**
 * Opt a builder into a collection. Idempotent — if already opted in
 * (active membership exists), returns the existing row.
 *
 * Re-checks BOTH gates server-side:
 *   1. profile.published === true
 *   2. collections.active === true (via requireActiveCollection)
 *
 * Throws CollectionGateError if either fails.
 */
export async function optIn(
  db: SupabaseClient,
  profile_id: string,
  slug: string,
  source: ConsentSource,
  source_metadata: Record<string, unknown> = {},
): Promise<MembershipRow> {
  await requirePublishedProfile(db, profile_id)
  await requireActiveCollection(db, slug)

  const existing = await getActiveMembership(db, profile_id, slug)
  if (existing) return existing

  const { data, error } = await db
    .from('collection_memberships')
    .insert({
      profile_id,
      collection_slug: slug,
      source,
      source_metadata,
    })
    .select('id, profile_id, collection_slug, opted_in_at, opted_out_at, source')
    .single()
  if (error || !data) throw new Error(`consent.optIn(${slug}): ${error?.message ?? 'no row returned'}`)
  return data as MembershipRow
}

/**
 * Opt a builder out of a collection. Sets opted_out_at on the active
 * row; preserves history. Idempotent — if no active row exists, no-op.
 */
export async function optOut(
  db: SupabaseClient,
  profile_id: string,
  slug: string,
): Promise<void> {
  const { error } = await db
    .from('collection_memberships')
    .update({ opted_out_at: new Date().toISOString() })
    .eq('profile_id', profile_id)
    .eq('collection_slug', slug)
    .is('opted_out_at', null)
  if (error) throw new Error(`consent.optOut(${slug}): ${error.message}`)
}

/** Get the active membership row for (profile, slug), or null. */
export async function getActiveMembership(
  db: SupabaseClient,
  profile_id: string,
  slug: string,
): Promise<MembershipRow | null> {
  const { data, error } = await db
    .from('collection_memberships')
    .select('id, profile_id, collection_slug, opted_in_at, opted_out_at, source')
    .eq('profile_id', profile_id)
    .eq('collection_slug', slug)
    .is('opted_out_at', null)
    .maybeSingle()
  if (error) throw new Error(`consent.getActiveMembership(${slug}): ${error.message}`)
  return (data as MembershipRow | null) ?? null
}

/** Boolean — convenience over getActiveMembership. */
export async function isConsented(
  db: SupabaseClient,
  profile_id: string,
  slug: string,
): Promise<boolean> {
  return (await getActiveMembership(db, profile_id, slug)) !== null
}

/**
 * List every active membership for one profile. Drives the dashboard's
 * "which cards show as opted-in?" computation alongside listActiveCollections.
 */
export async function listMembershipsForProfile(
  db: SupabaseClient,
  profile_id: string,
): Promise<MembershipRow[]> {
  const { data, error } = await db
    .from('collection_memberships')
    .select('id, profile_id, collection_slug, opted_in_at, opted_out_at, source')
    .eq('profile_id', profile_id)
    .is('opted_out_at', null)
  if (error) throw new Error(`consent.listMembershipsForProfile: ${error.message}`)
  return (data as MembershipRow[] | null) ?? []
}
