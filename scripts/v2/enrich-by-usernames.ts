/**
 * Reusable per-username enrichment backfill.
 *
 * Accepts space-separated usernames as argv; runs the same validated chain
 * as `runRealWrite` (which the original cohort script wraps with hardcoded
 * usernames + expected-count comparisons). This script makes no
 * assumptions about what should be produced — it just runs the engine
 * and prints honest results.
 *
 * Re-runs are dedupe-safe post-Batch-5: publishProofReceipt computes a
 * dedupe_key per receipt and the unique partial index rejects collisions
 * as PublishDuplicate (counted under failures.stage='duplicate', NOT a
 * real failure).
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/v2/enrich-by-usernames.ts \
 *     username1 username2 username3
 *
 * Optional env:
 *   GITHUB_TOKEN — raises GitHub rate ceiling from 60/hr → 5000/hr
 *                  (strongly recommended for >3 usernames)
 *
 * Required env (same as enrich-cohort-write.ts):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { runRealWrite } from '../../src/lib/enrichment/profile-adapter.ts'

const USAGE = `Usage: npx tsx --env-file=.env.local scripts/v2/enrich-by-usernames.ts <username1> [username2] ...

Runs the profile→engine enrichment chain for each named profile.
Re-runs are dedupe-safe (post-Batch-5 dedupe_key unique index).

Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Env recommended: GITHUB_TOKEN`

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : t.slice(0, n) + '…'
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  if (args.length === 0 || process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (use --env-file=.env.local).')
    process.exit(2)
  }
  if (!process.env.GITHUB_TOKEN) {
    console.error('[warn] GITHUB_TOKEN unset — GitHub API capped at 60/hr unauthenticated. Set it for >3 usernames.')
  }

  const usernames: readonly string[] = args
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  console.log('═'.repeat(78))
  console.log(`ENRICH-BY-USERNAMES — ${usernames.length} profile(s)`)
  console.log('═'.repeat(78))
  for (const u of usernames) console.log(`  • ${u}`)
  console.log()

  const start = Date.now()
  const report = await runRealWrite(admin, usernames, (msg) => console.error(msg))
  const ms = Date.now() - start
  console.log(`\n[write] complete in ${(ms / 1000).toFixed(1)}s\n`)

  // Per-builder section
  console.log('═'.repeat(78))
  console.log('PER-BUILDER RESULTS')
  console.log('═'.repeat(78))
  for (const b of report.per_builder) {
    const dupes = b.failures.filter((f) => f.stage === 'duplicate').length
    const realFailures = b.failures.length - dupes
    console.log(
      `\n${b.username} (${b.full_name ?? '?'}) — wrote ${b.written.length}, ` +
        `${b.skipped.length} skipped, ${realFailures} failures, ${dupes} dedupes`,
    )
    for (const r of b.written) {
      console.log(
        `    receipt #${r.receipt_db_id} slug=${r.receipt_slug} event=${r.event_type} ` +
          `roles=[${r.atlas_roles.join(',')}] conf=${r.atlas_confidence.toFixed(2)} ` +
          `vlevel=${r.verification_level}` +
          (r.entity_was_created ? ' [entity_created]' : ''),
      )
    }
    for (const f of b.failures) {
      if (f.stage === 'duplicate') {
        console.log(`    ↻ dedupe url=${f.artifact_url}`)
      } else {
        console.log(`    ✗ FAILURE stage=${f.stage} url=${f.artifact_url} error=${truncate(f.error, 200)}`)
      }
    }
  }

  // Totals
  console.log('\n' + '═'.repeat(78))
  console.log('TOTALS')
  console.log('═'.repeat(78))
  console.log(`  builders processed:          ${report.builders_processed}`)
  console.log(`  receipts written:            ${report.totals.receipts_written}`)
  console.log(`  entities created (new):      ${report.totals.entities_created}`)
  console.log(`  artifacts skipped (total):   ${report.totals.artifacts_skipped}`)
  for (const [reason, count] of Object.entries(report.totals.artifacts_skipped_by_reason)) {
    console.log(`    ${reason}: ${count}`)
  }
  console.log(`  artifacts failed (total):    ${report.totals.artifacts_failed}`)
  for (const [stage, count] of Object.entries(report.totals.artifacts_failed_by_stage)) {
    console.log(`    ${stage}: ${count}`)
  }
  console.log(`  dedupes collapsed:           ${report.totals.dedupes_collapsed}`)
  if (report.totals.builders_with_zero_receipts.length > 0) {
    console.log(`  builders with zero receipts: ${report.totals.builders_with_zero_receipts.join(', ')}`)
  }
}

main().catch((e: unknown) => {
  console.error('[enrich-by-usernames] FATAL:', e)
  process.exit(1)
})
