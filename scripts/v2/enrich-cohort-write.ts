/**
 * REAL WRITE — Profile→Engine enrichment commit against the D5 cohort
 * (18 verified individual builders).
 *
 * Runs the same validated chain as the dry-run, then calls
 * findOrCreateHumanEntity + publishProofReceipt to actually commit
 * proof_receipts + entities rows for the cohort. Per-artifact failures
 * are caught and logged; the batch does NOT abort on a single bad
 * classify or publish.
 *
 * Run (under tsx so the engine's `@/` aliases resolve at runtime):
 *   npx tsx --env-file=.env.local scripts/v2/enrich-cohort-write.ts
 *
 * Spec: docs/decisions/DISCOVERY_enrichment_adapter.md
 *
 * Writes ONLY to: entities, proof_receipts (+ verification_events,
 * ingestion_log, capabilities_vocab side-effects from publishProofReceipt).
 * Does NOT mutate: profiles, posts, projects, or anything else.
 */

import { createClient } from '@supabase/supabase-js'
import {
  runRealWrite,
  type WrittenReceipt,
  type WriteFailure,
} from '../../src/lib/enrichment/profile-adapter.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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

// Expected per-builder counts from the prior reviewed dry-run (post-cleanup).
const EXPECTED_COUNTS: Record<string, number> = {
  olalekanridwanullah197: 3,
  sunnyzheng606: 3,
  vinodkrishnabanda657: 1,
  ifioksundayuboh72: 2,
  sumitdongardive9: 2,
  joedias995: 2,
  aniketaslaliya801: 5,
  avikbhanja723: 3,
  nnekaewalu847: 2,
  celestinokariuki456: 2,
  anantdhavale962: 2,
  janwinum9: 4,
  emanuelcovelli123: 4,
  yuki448: 2,
  khairulanwar932: 2,
  eluwaemekamichael740: 2,
  ryangrant144: 12,
  andreaschristodoulou643: 2,
}
const EXPECTED_TOTAL = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0)

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : t.slice(0, n) + '…'
}

async function snapshot(label: string): Promise<{ receipts: number; entities: number; entity_kinds: Record<string, number> }> {
  const recRes = await admin.from('proof_receipts').select('*', { count: 'exact', head: true })
  if (recRes.error) throw new Error(`receipts count failed: ${recRes.error.message}`)
  const entRes = await admin.from('entities').select('kind')
  if (entRes.error) throw new Error(`entities count failed: ${entRes.error.message}`)
  const kinds: Record<string, number> = {}
  for (const e of entRes.data ?? []) {
    kinds[e.kind] = (kinds[e.kind] ?? 0) + 1
  }
  const total = (entRes.data ?? []).length
  console.log(`[${label}] proof_receipts: ${recRes.count}`)
  console.log(`[${label}] entities:       ${total}  (by kind: ${JSON.stringify(kinds)})`)
  return { receipts: recRes.count ?? -1, entities: total, entity_kinds: kinds }
}

async function perBuilderActual(
  usernames: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const u of usernames) {
    const { data: prof, error: e1 } = await admin
      .from('profiles')
      .select('id, entity_id')
      .eq('username', u)
      .maybeSingle()
    if (e1) throw new Error(`profile lookup ${u}: ${e1.message}`)
    if (!prof || !prof.entity_id) {
      counts.set(u, 0)
      continue
    }
    const { count, error: e2 } = await admin
      .from('proof_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', prof.entity_id)
    if (e2) throw new Error(`receipts count ${u}: ${e2.message}`)
    counts.set(u, count ?? 0)
  }
  return counts
}

async function spotCheckBuilder(username: string): Promise<void> {
  const { data: prof, error: e1 } = await admin
    .from('profiles')
    .select('id, username, full_name, entity_id')
    .eq('username', username)
    .maybeSingle()
  if (e1) throw e1
  if (!prof) {
    console.log(`  ${username}: PROFILE NOT FOUND`)
    return
  }
  const { data: entity } = await admin
    .from('entities')
    .select('id, external_id, slug, display_name, kind, owner_user_id')
    .eq('id', prof.entity_id ?? -1)
    .maybeSingle()
  console.log(`  username:      ${prof.username}`)
  console.log(`  full_name:     ${prof.full_name}`)
  console.log(`  profile.entity_id: ${prof.entity_id}`)
  if (entity) {
    console.log(
      `  entity:        id=${entity.id} kind=${entity.kind} slug=${entity.slug} external_id=${entity.external_id}`,
    )
  } else {
    console.log('  entity:        NOT FOUND')
    return
  }
  const { data: receipts, error: e3 } = await admin
    .from('proof_receipts')
    .select(
      'id, external_id, slug, event_type, title, atlas_inferred, atlas_confidence, artifacts, verification_level, visibility, issued_at',
    )
    .eq('subject_id', entity.id)
    .order('issued_at', { ascending: true })
  if (e3) throw e3
  console.log(`  receipts:      ${receipts?.length ?? 0}`)
  for (const r of receipts ?? []) {
    let firstArtifactUrl = '?'
    try {
      const arts = Array.isArray(r.artifacts) ? r.artifacts : []
      if (arts.length > 0 && typeof arts[0]?.url === 'string') firstArtifactUrl = arts[0].url
    } catch {
      // ignore
    }
    console.log(`    • id=${r.id} slug=${r.slug}`)
    console.log(`      external_id:    ${r.external_id}`)
    console.log(`      event_type:     ${r.event_type}`)
    console.log(`      title:          ${truncate(r.title, 120)}`)
    console.log(`      atlas_inferred: ${(r.atlas_inferred ?? []).join(', ') || '(none)'}`)
    console.log(`      confidence:     ${(r.atlas_confidence ?? 0).toFixed(2)}`)
    console.log(`      artifact_url:   ${firstArtifactUrl}`)
    console.log(`      verification:   ${r.verification_level}`)
    console.log(`      visibility:     ${r.visibility}`)
    console.log(`      canonical:      https://shipstacked.com/p/${r.slug}`)
  }
  console.log()
}

async function main(): Promise<void> {
  console.log('═'.repeat(78))
  console.log('PRE-WRITE SNAPSHOT')
  console.log('═'.repeat(78))
  const before = await snapshot('before')
  console.log()
  console.log(`  expected before:  receipts=0, entities=17 (all human)`)
  if (before.receipts !== 0) {
    console.error(`!! WARNING: before-receipts is ${before.receipts}, not 0. Proceeding anyway — caller bears responsibility.`)
  }
  if (before.entities !== 17) {
    console.error(`!! WARNING: before-entities is ${before.entities}, not 17.`)
  }
  console.log()

  console.log('═'.repeat(78))
  console.log(`WRITE PHASE — ${COHORT.length} builders, expected ${EXPECTED_TOTAL} receipts`)
  console.log('═'.repeat(78))
  const start = Date.now()
  const report = await runRealWrite(admin, COHORT, (msg) => console.error(msg))
  const ms = Date.now() - start
  console.log(`\n[write] complete in ${(ms / 1000).toFixed(1)}s\n`)

  // Per-builder section
  console.log('═'.repeat(78))
  console.log('PER-BUILDER WRITE RESULTS')
  console.log('═'.repeat(78))
  for (const b of report.per_builder) {
    const expected = EXPECTED_COUNTS[b.username] ?? -1
    const match = b.written.length === expected ? '✓' : '✗'
    console.log(
      `\n${match} ${b.username} (${b.full_name ?? '?'}) — wrote ${b.written.length} / expected ${expected}, ` +
        `${b.skipped.length} skipped, ${b.failures.length} failures`,
    )
    for (const r of b.written) {
      console.log(
        `    receipt #${r.receipt_db_id} slug=${r.receipt_slug} event=${r.event_type} ` +
          `roles=[${r.atlas_roles.join(',')}] conf=${r.atlas_confidence.toFixed(2)} ` +
          `vlevel=${r.verification_level}` +
          (r.entity_was_created ? ' [entity_created]' : ''),
      )
    }
    if (b.failures.length > 0) {
      for (const f of b.failures) {
        console.log(`    ✗ FAILURE stage=${f.stage} url=${f.artifact_url} error=${truncate(f.error, 200)}`)
      }
    }
  }

  // Post-write snapshot
  console.log('\n' + '═'.repeat(78))
  console.log('POST-WRITE SNAPSHOT')
  console.log('═'.repeat(78))
  const after = await snapshot('after')
  console.log()
  console.log(`  delta receipts:   +${after.receipts - before.receipts}`)
  console.log(`  delta entities:   +${after.entities - before.entities}`)

  // Per-builder verification (counts from prod, not from in-memory report)
  console.log('\n' + '═'.repeat(78))
  console.log('PER-BUILDER PROD COUNTS (queried back from DB)')
  console.log('═'.repeat(78))
  const actualCounts = await perBuilderActual(COHORT)
  let allMatch = true
  for (const u of COHORT) {
    const expected = EXPECTED_COUNTS[u] ?? -1
    const actual = actualCounts.get(u) ?? -1
    const status = actual === expected ? '✓' : '✗'
    if (actual !== expected) allMatch = false
    console.log(`  ${status} ${u}: expected ${expected}, actual ${actual}`)
  }
  console.log(`\n  cohort match: ${allMatch ? 'ALL CORRECT ✓' : 'MISMATCH ✗'}`)

  // Spot-check 3 builders
  console.log('\n' + '═'.repeat(78))
  console.log('SPOT-CHECK — aniketaslaliya801')
  console.log('═'.repeat(78))
  await spotCheckBuilder('aniketaslaliya801')
  console.log('═'.repeat(78))
  console.log('SPOT-CHECK — sunnyzheng606')
  console.log('═'.repeat(78))
  await spotCheckBuilder('sunnyzheng606')
  console.log('═'.repeat(78))
  console.log('SPOT-CHECK — yuki448')
  console.log('═'.repeat(78))
  await spotCheckBuilder('yuki448')

  // Failures roll-up
  console.log('═'.repeat(78))
  console.log('FAILURES (per-artifact, batch did not abort)')
  console.log('═'.repeat(78))
  if (report.failures.length === 0) {
    console.log('(none)')
  } else {
    for (const f of report.failures) {
      console.log(`  ${f.profile_username} :: ${f.artifact_url} :: stage=${f.stage}`)
      console.log(`    error: ${truncate(f.error, 200)}`)
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

  // Invariants
  console.log('\n' + '═'.repeat(78))
  console.log('INVARIANT CHECKS')
  console.log('═'.repeat(78))
  const expectedDeltaReceipts = report.totals.receipts_written
  const actualDeltaReceipts = after.receipts - before.receipts
  console.log(
    `  proof_receipts delta:   in-memory=${expectedDeltaReceipts}, db=${actualDeltaReceipts} — ${expectedDeltaReceipts === actualDeltaReceipts ? '✓ match' : '✗ MISMATCH'}`,
  )
  const expectedDeltaEntities = report.totals.entities_created
  const actualDeltaEntities = after.entities - before.entities
  console.log(
    `  entities delta:         in-memory=${expectedDeltaEntities}, db=${actualDeltaEntities} — ${expectedDeltaEntities === actualDeltaEntities ? '✓ match' : '✗ MISMATCH'}`,
  )
  const allHuman = Object.keys(after.entity_kinds).every((k) => k === 'human')
  console.log(`  all entities kind=human:  ${allHuman ? '✓ yes' : '✗ NO — ' + JSON.stringify(after.entity_kinds)}`)
}

main().catch((e: unknown) => {
  console.error('[write] FATAL:', e)
  process.exit(1)
})
