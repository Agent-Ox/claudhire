/**
 * Slug generation for proof_receipts and entities.
 *
 * Spec: docs/v2/STEP_6_PUBLISH_API_SPEC.md §4.
 *
 * normalizeSlug() is pure (string → string); the table-aware lookup is the
 * caller's concern. generateUniqueSlug() handles the collision-retry walk
 * against a Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const SLUG_MAX = 60;
const MAX_NUMERIC_RETRIES = 1000;

export function normalizeSlug(input: string): string {
  // Decompose accented chars then strip combining marks ("é" → "e").
  const ascii = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, ''); // trim a trailing hyphen left by the slice
  return slug || 'untitled';
}

export type SluggableTable = 'proof_receipts' | 'entities';

/**
 * Walk numeric suffixes (`base`, `base-2`, ...) until an unused slug is
 * found. Returns the first unused candidate WITHOUT inserting — callers
 * still need to handle the race where a concurrent insert grabs it, by
 * catching the unique-violation on insert and retrying with a fresh call.
 *
 * Implementation: one SELECT that fetches every slug starting with `base`,
 * walked client-side to find the first gap. Slugs are constrained to
 * [a-z0-9-] so the LIKE prefix is safe from SQL pattern wildcards.
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient,
  table: SluggableTable,
  base: string,
): Promise<string> {
  const normalized = normalizeSlug(base);
  const { data, error } = await supabase
    .from(table)
    .select('slug')
    .or(`slug.eq.${normalized},slug.like.${normalized}-%`);

  if (error) {
    throw new Error(`slug lookup failed on ${table}: ${error.message}`);
  }
  const taken = new Set<string>((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(normalized)) return normalized;
  for (let n = 2; n <= MAX_NUMERIC_RETRIES; n++) {
    const candidate = `${normalized}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Pathological — fall back to a random suffix.
  const random = Math.random().toString(36).slice(2, 6);
  return `${normalized}-${random}`;
}
