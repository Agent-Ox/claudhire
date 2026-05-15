/**
 * Entity helpers.
 *
 * Phase 1A: subject auto-creation for the /paste flow. A logged-in user
 * who hits Publish for the first time gets a single `kind = 'human'`
 * entity with a derived display_name + slug. Subsequent publishes reuse
 * that row. The /claim flow (which writes to `claim_submissions`, not
 * `entities`) is unaffected.
 *
 * Spec: docs/v2/STEP_6_PUBLISH_API_SPEC.md §3.4.
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
}

export interface FindOrCreateResult {
  entity: EntityRow;
  was_created: boolean;
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
 * Look up the user's human entity; create one if missing.
 *
 * Caller is responsible for compensating delete if a subsequent write in
 * the publish flow fails — see publish.ts. Use the service-role client
 * because RLS policies require `owner_user_id = auth.uid()` and we may
 * not have a session-bound supabase client in every path that needs this
 * helper.
 */
export async function findOrCreateHumanEntity(
  admin: SupabaseClient,
  user: User,
): Promise<FindOrCreateResult> {
  const { data: existing, error: findErr } = await admin
    .from('entities')
    .select('id, external_id, kind, display_name, slug, owner_user_id')
    .eq('owner_user_id', user.id)
    .eq('kind', 'human')
    .limit(1)
    .maybeSingle();

  if (findErr && findErr.code !== 'PGRST116') {
    throw new Error(`entity lookup failed: ${findErr.message}`);
  }
  if (existing) {
    return { entity: existing as EntityRow, was_created: false };
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
    .select('id, external_id, kind, display_name, slug, owner_user_id')
    .single();

  if (insertErr || !inserted) {
    // Unique-violation race: another publish in flight just claimed the
    // slug or owner_user_id. Re-read; if a row now exists, use it.
    if (insertErr?.code === '23505') {
      const { data: raceWinner } = await admin
        .from('entities')
        .select('id, external_id, kind, display_name, slug, owner_user_id')
        .eq('owner_user_id', user.id)
        .eq('kind', 'human')
        .limit(1)
        .maybeSingle();
      if (raceWinner) return { entity: raceWinner as EntityRow, was_created: false };
    }
    throw new Error(`entity insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  return { entity: inserted as EntityRow, was_created: true };
}

export async function deleteEntity(admin: SupabaseClient, id: number): Promise<void> {
  await admin.from('entities').delete().eq('id', id);
}
