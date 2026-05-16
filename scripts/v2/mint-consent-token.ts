/**
 * Mint a single-purpose opt-in token for a builder + collection.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/v2/mint-consent-token.ts \
 *     --username <username> --collection <slug> [--ttl-days 7]
 *
 * Both --username and --collection are REQUIRED — no defaults.
 *
 * Refuses:
 *   - unpublished profiles (consent gate)
 *   - unknown collection slugs (no row in collections)
 *   - inactive collections (active=false)
 *
 * Outputs the redemption URL. This script does NOT send any email.
 *
 * Spec: docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md  §3, §5.1
 * Discovery: docs/audit/GATEWAY_DISCOVERY.md §H (revised) — H8.
 */

import { createClient } from '@supabase/supabase-js'
import { mintToken } from '../../src/lib/collections/tokens.ts'
import { collectionOptinUrl } from '../../src/lib/collections/context.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) continue
    out[key] = next
    i++
  }
  return out
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const username = args.username
  const slug = args.collection
  const ttlDays = args['ttl-days'] ? Number(args['ttl-days']) : 7

  if (!username || !slug) {
    console.error('ERROR: both --username and --collection are required (no defaults)')
    console.error('Usage: mint-consent-token.ts --username <username> --collection <slug> [--ttl-days 7]')
    process.exit(2)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Resolve username → profile_id (script-side lookup; the gate in
  // mintToken re-checks published).
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, username, full_name, published')
    .eq('username', username)
    .maybeSingle()
  if (pErr) { console.error('profile lookup failed:', pErr.message); process.exit(1) }
  if (!profile) { console.error(`no profile with username "${username}"`); process.exit(1) }
  if (!profile.published) {
    console.error(`profile "${username}" is not published — refusing to mint`)
    process.exit(1)
  }

  try {
    const tok = await mintToken(admin, profile.id as string, slug, ttlDays)
    const url = collectionOptinUrl(slug, tok.token)
    console.log(`minted token for ${username} → collection "${slug}" (ttl=${ttlDays}d)`)
    console.log(`expires_at: ${tok.expires_at}`)
    console.log('')
    console.log('Redemption URL (send out-of-band to the builder — this script sends nothing):')
    console.log(`  ${url}`)
  } catch (e) {
    console.error('mint failed:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}

main().catch(e => {
  console.error('FATAL:', e?.message ?? e)
  process.exit(1)
})
