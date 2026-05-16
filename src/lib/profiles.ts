/**
 * Shared published-profile fetcher.
 *
 * Extracted from the inline query that previously lived in
 * src/app/u/[username]/page.tsx (lines 36-41 + 11-15). Both that page
 * AND the Beacon-5 MCP `get-builder` tool now import this function so
 * the universal `profiles.published = true` fake-exclusion gate
 * (Beacon 3 Invariant #2) is enforced via a single shared source —
 * impossible for either consumer to drift away from it.
 *
 * The extraction is behavior-preserving: same SQL, same gate, same row.
 * The Phase-2 commit gate captured the inline-query output BEFORE this
 * extraction and the extracted-function output AFTER, and asserted the
 * two are byte-identical (SHA-256 match). Same precedent as Beacon 4's
 * parseAtlas extraction from scripts/seed-atlas-roles.ts.
 *
 * Spec:      docs/v2/TIER_3_BEACON_5_MCP_SERVER_SPEC.md §3 (reuse
 *            existing single sources, never re-implement)
 * Discovery: docs/audit/BEACON_5_DISCOVERY.md §C.4 + §D + §F.2
 *            (Decision B: extract; byte-identical proof mandatory).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch a builder profile by username, gated to `published = true`.
 *
 * The `.eq('published', true)` filter is the universal post-Tier-1 gate.
 * Unpublished profiles (the 3 known fake test personas, plus any future
 * unpublished entries) return `null` — INDISTINGUISHABLE from a row that
 * does not exist at all. This is load-bearing for the MCP `get-builder`
 * tool's no-oracle property: a fake username and a nonexistent username
 * produce the same null result, the same downstream response.
 *
 * Returns the full row (matches the previous main-page `select('*')`
 * query exactly — byte-identical proven). Callers that want a subset of
 * columns just pick from the returned object; the fetcher does not
 * narrow because narrowing would force two functions and re-introduce
 * the dual-source-of-truth this extraction exists to eliminate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProfileRow = Record<string, any>

export async function getPublishedProfile(
  db: SupabaseClient,
  username: string,
): Promise<ProfileRow | null> {
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('published', true)
    .single()
  return data
}
