/**
 * DRY RUN — Profile→Engine enrichment adapter against the D5 cohort
 * (18 verified individual builders).
 *
 * Reads profiles/projects/posts via the service-role client, runs the REAL
 * /paste chain per unique artifact:
 *   validateUrl → classifyUrl → analyzePastedUrl → classifyAtlasRoles
 * Then prints the would-be receipts + data-quality report.
 *
 * WRITES NOTHING. publishProofReceipt and findOrCreateHumanEntity are NOT
 * called.
 *
 * Run (under tsx so the engine's `@/` aliases resolve at runtime):
 *   npx tsx --env-file=.env.local scripts/v2/enrich-cohort-dryrun.ts
 *
 * `node --experimental-strip-types` will NOT work — analyzer.ts and
 * classifier.ts import their dependencies via `@/`-aliased runtime imports,
 * which the strip-types loader does not resolve. tsx does.
 *
 * Spec: docs/decisions/DISCOVERY_enrichment_adapter.md
 */

import { createClient } from '@supabase/supabase-js'
import { runDryRun, type WouldBeReceipt, type SkippedArtifact } from '../../src/lib/enrichment/profile-adapter.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Cohort per D5 — verified=true minus founder/test thomasoxlee198.
// Order matches the decisions doc enumeration.
const COHORT: readonly string[] = [
  'olalekanridwanullah197',
  'sunnyzheng606',
  'vinodkrishnabanda657',
  'ifioksundayuboh72',
  'sumitdongardive9',
  'joedias995',
  'aniketaslaliya801',
  'avikbhanja723',
  'nnekaewalu847',
  'celestinokariuki456',
  'anantdhavale962',
  'janwinum9',
  'emanuelcovelli123',
  'yuki448',
  'khairulanwar932',
  'eluwaemekamichael740',
  'ryangrant144',
  'andreaschristodoulou643',
]

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : t.slice(0, n) + '…'
}

function fmtReceipt(r: WouldBeReceipt): string {
  const lines: string[] = []
  lines.push(`  • ${r.artifact_url}`)
  lines.push(`    event_type:        ${r.event_type}`)
  lines.push(`    basis:             ${r.event_type_basis}`)
  lines.push(`    title              [${r.title_provenance}]: ${truncate(r.title, 160)}`)
  lines.push(`    description        [${r.description_provenance}]: ${truncate(r.description, 200)}`)
  lines.push(
    `    capabilities:      ${r.capabilities.length > 0 ? r.capabilities.join(', ') : '(none from analyzer)'}`,
  )
  lines.push(
    `    stack:             ${r.stack_summary.length > 0 ? r.stack_summary.join(', ') : '(none from analyzer)'}`,
  )
  lines.push(`    outcomes_suggested by analyzer: ${r.outcomes_suggestions_count}`)
  lines.push(
    `    atlas_roles:       ${r.atlas_roles.length > 0 ? r.atlas_roles.join(', ') : '(none)'} ` +
      `(confidence ${r.atlas_confidence.toFixed(2)})`,
  )
  lines.push(`    atlas_reason:      ${truncate(r.atlas_reasoning, 200)}`)
  lines.push(
    `    url:               source=${r.url_source} reachable=${r.url_reachable} http=${r.url_http_status}`,
  )
  return lines.join('\n')
}

function fmtSkip(s: SkippedArtifact): string {
  const raw = s.raw_url ? ` raw="${truncate(s.raw_url, 100)}"` : ''
  const detail = s.detail ? ` detail="${truncate(s.detail, 120)}"` : ''
  return `  ✗ ${s.source_row_label} — reason=${s.reason}${raw}${detail}`
}

async function main(): Promise<void> {
  const start = Date.now()
  console.log(`[dryrun] Starting against ${COHORT.length} builders. NO WRITES.`)
  console.log('[dryrun] classifyAtlasRoles will call the Anthropic API per artifact (read/classify only).\n')

  const report = await runDryRun(admin, COHORT, (msg) => console.error(msg))
  const ms = Date.now() - start
  console.log(`\n[dryrun] Complete in ${(ms / 1000).toFixed(1)}s.\n`)

  console.log('═'.repeat(78))
  console.log('PER-BUILDER WOULD-BE RECEIPTS')
  console.log('═'.repeat(78))
  for (const b of report.per_builder) {
    console.log(
      `\n── ${b.username} (${b.full_name ?? '?'}) ` +
        `— ${b.would_be_receipts.length} receipts, ${b.skipped.length} skipped`,
    )
    if (b.would_be_receipts.length === 0 && b.skipped.length === 0) {
      console.log('  (no candidate artifacts)')
    }
    for (const r of b.would_be_receipts) {
      console.log(fmtReceipt(r))
    }
    if (b.skipped.length > 0) {
      console.log(`  SKIPPED on this builder:`)
      for (const s of b.skipped) console.log(fmtSkip(s))
    }
  }

  console.log('\n' + '═'.repeat(78))
  console.log('DEDUPE COLLAPSES')
  console.log('═'.repeat(78))
  if (report.dedupes.length === 0) {
    console.log('(none)')
  } else {
    for (const d of report.dedupes) {
      console.log(`  ${d.profile_username} :: ${d.normalized_url}`)
      console.log(`    ${d.count} contributing sources: ${d.source_labels.join(' / ')}`)
    }
  }

  console.log('\n' + '═'.repeat(78))
  console.log('SKIPPED ARTIFACTS (flat)')
  console.log('═'.repeat(78))
  if (report.skipped.length === 0) {
    console.log('(none)')
  } else {
    for (const s of report.skipped) {
      const raw = s.raw_url ? ` raw="${truncate(s.raw_url, 100)}"` : ''
      const detail = s.detail ? ` detail="${truncate(s.detail, 120)}"` : ''
      console.log(`  ${s.profile_username} :: ${s.source_row_label} — ${s.reason}${raw}${detail}`)
    }
  }

  console.log('\n' + '═'.repeat(78))
  console.log('ACCEPTED OBSERVATIONS (flags #4–#6 — recorded, NOT errors)')
  console.log('═'.repeat(78))

  console.log(`\n#4 missing-https typos (skipped at validateUrl, fixable-at-source-later):`)
  if (report.accepted_observations.malformed_typos.length === 0) {
    console.log('  (none)')
  } else {
    for (const m of report.accepted_observations.malformed_typos) {
      console.log(`  ${m.username} :: ${m.source} :: raw="${m.raw_url}"`)
    }
  }

  console.log(`\n#5 unreachable URLs (receipt would still be written — matches real /paste):`)
  if (report.accepted_observations.unreachable_but_classified.length === 0) {
    console.log('  (none)')
  } else {
    for (const u of report.accepted_observations.unreachable_but_classified) {
      console.log(`  ${u.username} :: ${u.artifact_url}  (http=${u.http_status})`)
    }
  }

  console.log(`\n#6 low-confidence github-root receipts (confidence < 0.30 — honest, kept):`)
  if (report.accepted_observations.low_confidence_github_root.length === 0) {
    console.log('  (none)')
  } else {
    for (const lc of report.accepted_observations.low_confidence_github_root) {
      console.log(`  ${lc.username} :: ${lc.artifact_url}  (confidence ${lc.confidence.toFixed(2)})`)
    }
  }

  console.log('\n' + '═'.repeat(78))
  console.log('TOTALS')
  console.log('═'.repeat(78))
  console.log(`  builders processed:          ${report.builders_processed}`)
  console.log(`  receipts would create:       ${report.totals.receipts_would_create}`)
  console.log(`  artifacts skipped (total):   ${report.totals.artifacts_skipped}`)
  for (const [reason, count] of Object.entries(report.totals.artifacts_skipped_by_reason)) {
    console.log(`    ${reason}: ${count}`)
  }
  console.log(`  dedupes collapsed:           ${report.totals.dedupes_collapsed}`)
  if (report.totals.builders_with_zero_receipts.length > 0) {
    console.log(
      `  builders with zero receipts: ${report.totals.builders_with_zero_receipts.join(', ')}`,
    )
  }
  console.log(`  accepted #4 (missing-https):       ${report.accepted_observations.malformed_typos.length}`)
  console.log(`  accepted #5 (unreachable URLs):    ${report.accepted_observations.unreachable_but_classified.length}`)
  console.log(`  accepted #6 (low-conf gh-root):    ${report.accepted_observations.low_confidence_github_root.length}`)
  console.log()
  console.log(
    'NO WRITES PERFORMED. publishProofReceipt and findOrCreateHumanEntity were not invoked.',
  )
}

main().catch((e: unknown) => {
  console.error('[dryrun] FATAL:', e)
  process.exit(1)
})
