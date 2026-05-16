/**
 * Entity helpers.
 *
 * Tier 1 merge (docs/v2/TIER_1_MERGE_SPEC.md §4.3): resolves V1 `profiles`
 * to V2 `entities` BEFORE creating a new entity. Same human → one entity.
 * The link is bidirectional (`profiles.entity_id` ↔ `entities.profile_id`,
 * migration 20260516142038_merge_profiles_entities_link.sql).
 *
 * The pre-merge behaviour — deriving slug from user_metadata.full_name with
 * no profiles lookup — caused the audit Part 3 duplicate-identity bug
 * (entity_canonical_url 404 against /u/[username]). That path now only
 * fires for genuinely new users with no V1 profile.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { entityExternalId } from './ulid.ts';
import { generateUniqueSlug, normalizeSlug } from './paste/slug.ts';

export interface EntityRow {
  id: number;
  external_id: string;
  kind: 'human' | 'operator' | 'fleet' | 'agent';
  display_name: string;
  slug: string;
  owner_user_id: string;
  profile_id?: string | null;
}

export interface FindOrCreateResult {
  entity: EntityRow;
  was_created: boolean;
}

interface ProfileLite {
  id: string;
  username: string;
  full_name: string | null;
  entity_id: number | null;
}

function deriveDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) return fullName;
  const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
  if (name) return name;
  const email = user.email || '';
  const prefix = email.split('@')[0]?.trim() || '';
  if (prefix) return prefix;
  return 'Builder';
}

function deriveSlugBase(user: User, displayName: string): string {
  const base = normalizeSlug(displayName);
  if (base && base !== 'untitled') return base;
  const email = user.email || '';
  const prefix = email.split('@')[0]?.trim() || '';
  return normalizeSlug(prefix || 'builder');
}

/**
 * Look up the existing V1 profile for this auth user, if any.
 * Returns null when the user has no V1 profile (genuinely new account).
 */
async function findExistingProfile(
  admin: SupabaseClient,
  user: User,
): Promise<ProfileLite | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, username, full_name, entity_id')
    .eq('user_id', user.id)
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`profile lookup failed: ${error.message}`);
  }
  return (data as ProfileLite | null) ?? null;
}

async function fetchEntityById(
  admin: SupabaseClient,
  id: number,
): Promise<EntityRow | null> {
  const { data, error } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('id', id)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`entity fetch-by-id failed: ${error.message}`);
  }
  return (data as EntityRow | null) ?? null;
}

async function fetchEntityByOwner(
  admin: SupabaseClient,
  userId: string,
): Promise<EntityRow | null> {
  const { data, error } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .eq('owner_user_id', userId)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(`entity lookup failed: ${error.message}`);
  }
  return (data as EntityRow | null) ?? null;
}

async function writeProfileEntityLink(
  admin: SupabaseClient,
  profileId: string,
  entityId: number,
): Promise<void> {
  const { error } = await admin
    .from('profiles')
    .update({ entity_id: entityId })
    .eq('id', profileId);
  if (error) {
    throw new Error(`profile.entity_id update failed: ${error.message}`);
  }
}

/**
 * Resolve the human entity for this user, creating it if missing.
 *
 * Resolution order (Spec §4.3):
 *   1. If V1 profile exists AND profile.entity_id is set → fetch & return that entity (idempotent).
 *   2. If V1 profile exists AND profile.entity_id null AND an entity already exists for this
 *      owner_user_id → link profile.entity_id to it and return.
 *   3. If V1 profile exists AND no entity yet → INSERT entity with slug = profile.username
 *      VERBATIM and display_name = profile.full_name; link profile.entity_id; return.
 *   4. No V1 profile → original behaviour (derive slug from user_metadata / email).
 *
 * The §0 non-negotiable: when a profile is found, `entities.slug` MUST equal
 * `profiles.username` exactly. Never normalised, never transformed.
 */
export async function findOrCreateHumanEntity(
  admin: SupabaseClient,
  user: User,
): Promise<FindOrCreateResult> {
  const profile = await findExistingProfile(admin, user);

  // ─── Path 1: V1 profile exists, already linked ────────────────────────
  if (profile?.entity_id) {
    const linked = await fetchEntityById(admin, profile.entity_id);
    if (linked) return { entity: linked, was_created: false };
    // Linked entity row missing — fall through to re-create (defensive).
  }

  // ─── Path 2: V1 profile exists, no link yet, but an entity already exists ─
  if (profile) {
    const existingByOwner = await fetchEntityByOwner(admin, user.id);
    if (existingByOwner) {
      // Link profile → entity (idempotent if entity already had profile_id set).
      if (!profile.entity_id) {
        await writeProfileEntityLink(admin, profile.id, existingByOwner.id);
      }
      return { entity: existingByOwner, was_created: false };
    }
  }

  // ─── Path 3: V1 profile exists, no entity yet → CREATE with username slug ─
  if (profile) {
    const displayName = profile.full_name?.trim() || deriveDisplayName(user);
    const slug = profile.username; // VERBATIM — Spec §0 invariant.

    const row = {
      external_id: entityExternalId(),
      kind: 'human' as const,
      display_name: displayName,
      slug,
      owner_user_id: user.id,
      profile_id: profile.id,
    };

    const { data: inserted, error: insertErr } = await admin
      .from('entities')
      .insert(row)
      .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
      .single();

    if (insertErr || !inserted) {
      // Race: another publish in flight just claimed the slug or owner_user_id.
      if (insertErr?.code === '23505') {
        const raceWinner = await fetchEntityByOwner(admin, user.id);
        if (raceWinner) {
          if (!profile.entity_id) {
            await writeProfileEntityLink(admin, profile.id, raceWinner.id);
          }
          return { entity: raceWinner, was_created: false };
        }
      }
      throw new Error(`entity insert failed: ${insertErr?.message ?? 'unknown'}`);
    }

    await writeProfileEntityLink(admin, profile.id, (inserted as EntityRow).id);
    return { entity: inserted as EntityRow, was_created: true };
  }

  // ─── Path 4: no V1 profile (genuinely new user) → pre-merge behaviour ─
  const existingByOwner = await fetchEntityByOwner(admin, user.id);
  if (existingByOwner) {
    return { entity: existingByOwner, was_created: false };
  }

  const displayName = deriveDisplayName(user);
  const slugBase = deriveSlugBase(user, displayName);
  const slug = await generateUniqueSlug(admin, 'entities', slugBase);

  const row = {
    external_id: entityExternalId(),
    kind: 'human' as const,
    display_name: displayName,
    slug,
    owner_user_id: user.id,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('entities')
    .insert(row)
    .select('id, external_id, kind, display_name, slug, owner_user_id, profile_id')
    .single();

  if (insertErr || !inserted) {
    if (insertErr?.code === '23505') {
      const raceWinner = await fetchEntityByOwner(admin, user.id);
      if (raceWinner) return { entity: raceWinner, was_created: false };
    }
    throw new Error(`entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}

export async function deleteEntity(admin: SupabaseClient, id: number): Promise<void> {
  await admin.from('entities').delete().eq('id', id);
}
