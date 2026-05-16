/**
 * Tokens layer — single-purpose opt-in tokens.
 *
 * A token literally cannot do anything except opt the specific
 * profile into the specific collection it was minted for. No broader
 * account access (deliberately NOT a Supabase magic-link, per spec
 * §3 "single-purpose only").
 *
 * Lifecycle:
 *   mintToken → INSERT consent_tokens row with random 256-bit token
 *   redeemToken → reads, validates (not used / not revoked / not expired),
 *                 marks used_at, returns the (profile_id, slug) it scopes to
 *   revokeToken → manual invalidation by admin
 */

import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireActiveCollection } from './collections.ts'

const DEFAULT_TTL_DAYS = 7

export interface ConsentTokenRow {
  token: string
  profile_id: string
  collection_slug: string
  created_at: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

export type TokenRedemptionResult =
  | { ok: true; profile_id: string; collection_slug: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'revoked' }

/**
 * Generate a single-purpose opt-in token. Refuses unpublished profiles
 * AND unknown/inactive collections (both gates) — the admin script
 * (scripts/v2/mint-consent-token.ts) is the only intended caller.
 */
export async function mintToken(
  db: SupabaseClient,
  profile_id: string,
  slug: string,
  ttl_days: number = DEFAULT_TTL_DAYS,
): Promise<ConsentTokenRow> {
  // Gate: collection must be live.
  await requireActiveCollection(db, slug)

  // Gate: profile must exist + be published.
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('id, published')
    .eq('id', profile_id)
    .maybeSingle()
  if (profErr) throw new Error(`tokens.mintToken profile lookup: ${profErr.message}`)
  if (!profile || !profile.published) {
    throw new Error(`tokens.mintToken: profile ${profile_id} not published — refusing to mint`)
  }

  const token = randomBytes(32).toString('base64url')
  const expires_at = new Date(Date.now() + ttl_days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('consent_tokens')
    .insert({
      token,
      profile_id,
      collection_slug: slug,
      expires_at,
    })
    .select('token, profile_id, collection_slug, created_at, expires_at, used_at, revoked_at')
    .single()
  if (error || !data) throw new Error(`tokens.mintToken insert: ${error?.message ?? 'no row returned'}`)
  return data as ConsentTokenRow
}

/**
 * Look up a token; return its (profile_id, slug) if redeemable, or a
 * reason code otherwise. Does NOT mark used — that's redeemAndConsume's job.
 */
export async function inspectToken(
  db: SupabaseClient,
  token: string,
): Promise<TokenRedemptionResult> {
  const { data, error } = await db
    .from('consent_tokens')
    .select('token, profile_id, collection_slug, expires_at, used_at, revoked_at')
    .eq('token', token)
    .maybeSingle()
  if (error) throw new Error(`tokens.inspectToken: ${error.message}`)
  if (!data) return { ok: false, reason: 'not_found' }
  if (data.revoked_at) return { ok: false, reason: 'revoked' }
  if (data.used_at) return { ok: false, reason: 'already_used' }
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: 'expired' }
  return { ok: true, profile_id: data.profile_id, collection_slug: data.collection_slug }
}

/**
 * Atomic redeem: marks the token used and returns its scope. Should be
 * called in the same request as the membership write so a failed
 * membership write doesn't leave a used token with no consent record.
 *
 * The route handler is responsible for calling optIn AFTER successful
 * redemption — and rolling back used_at if the optIn write fails (the
 * window is small but real; see route comment).
 */
export async function redeemAndConsume(
  db: SupabaseClient,
  token: string,
): Promise<TokenRedemptionResult> {
  // Inspect first to surface the failure reason; then mark used.
  const inspection = await inspectToken(db, token)
  if (!inspection.ok) return inspection
  const { error } = await db
    .from('consent_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null) // race-safe: only the first concurrent attempt wins
  if (error) throw new Error(`tokens.redeemAndConsume: ${error.message}`)
  return inspection
}

/** Manual revocation by admin. */
export async function revokeToken(db: SupabaseClient, token: string): Promise<void> {
  const { error } = await db
    .from('consent_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .is('revoked_at', null)
  if (error) throw new Error(`tokens.revokeToken: ${error.message}`)
}
