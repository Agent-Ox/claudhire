/**
 * Verification harness for Step 7 public pages + JSON-LD + Atlas dereferencing.
 *
 * Run: node --env-file=.env.local scripts/v2/verify-step-7.ts
 *
 * Covers §8 scenarios from STEP_7_PUBLIC_PAGES_SPEC. Reuses the Step 6
 * test user; creates fresh public + unlisted receipts, walks the HTML +
 * JSON-LD surfaces, then cleans up.
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { publishProofReceipt, type PasteDraft } from '../../src/lib/paste/publish.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEV_BASE = process.env.STEP7_DEV_BASE || 'http://localhost:3000'

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TEST_EMAIL = 'step7-verify@shipstacked.test'
const TEST_PASSWORD = 'StepSeven!Verify_2026'
const TEST_TITLE_PUBLIC = `Step7 public ${new Date().toISOString().slice(0, 19)}`
const TEST_TITLE_UNLISTED = `Step7 unlisted ${new Date().toISOString().slice(0, 19)}`

let allPass = true
function check(label: string, ok: boolean, detail?: unknown) {
  const icon = ok ? '✓' : '✗'
  const detailStr =
    detail === undefined
      ? ''
      : `  ${typeof detail === 'string' ? detail.slice(0, 200) : JSON.stringify(detail).slice(0, 200)}`
  console.log(`  ${icon} ${label}${detailStr}`)
  if (!ok) allPass = false
}
function header(s: string) {
  console.log(`\n──── ${s} ────`)
}

async function ensureTestUser(): Promise<User> {
  const created = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Step 7 Verify' },
  })
  if (created.data?.user) return created.data.user
  const { data: list } = await admin.auth.admin.listUsers()
  const found = list?.users?.find((u) => u.email === TEST_EMAIL)
  if (!found) throw new Error('could not create or find test user')
  return found
}

async function cleanupUserData(user: User) {
  const { data: entities } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', user.id)
  if (entities && entities.length > 0) {
    const ids = entities.map((e) => e.id as number)
    await admin.from('proof_receipts').delete().in('subject_id', ids)
    await admin.from('entities').delete().in('id', ids)
  }
}

function makeDraft(overrides: Partial<PasteDraft>): PasteDraft {
  return {
    url: 'https://github.com/anthropics/claude-code',
    source: 'github',
    event_type: 'published_repo',
    title: 'placeholder',
    description: 'Step 7 verification synthetic receipt.\n\n- markdown bullet\n- second bullet',
    occurred_at: new Date().toISOString(),
    occurred_at_precision: 'day',
    artifacts: [
      { kind: 'repo', url: 'https://github.com/anthropics/claude-code', title: 'anthropics/claude-code' },
    ],
    stack: [
      { name: 'claude-sonnet-4-6', category: 'model', role: 'primary' },
      { name: 'next', category: 'framework', role: 'secondary' },
    ],
    outcomes: [],
    capabilities: ['step7-marker'],
    atlas_roles_confirmed: ['A4', 'B2'],
    atlas_roles_claimed: [],
    atlas_roles_inferred: ['A4'],
    atlas_confidence: 0.91,
    classifier_version: 'claude-classifier-v0.1.0',
    classifier_reasoning: 'Step 7 synthetic reasoning.',
    classifier_reachable: true,
    visibility: 'public',
    wanted_attestation: false,
    ...overrides,
  }
}

async function stashRedisDraft(draftId: string, user: User, title: string) {
  await redis.set(
    `paste-draft:${draftId}`,
    {
      url: 'https://github.com/anthropics/claude-code',
      user_id: user.id,
      classify: {
        source: 'github',
        reachable: true,
        http_status: 200,
        metadata: {},
        event_type_candidate: 'published_repo',
      },
      analyze: {
        title_draft: title,
        description_draft: 'desc',
        artifacts: [],
        stack: [],
        outcomes_suggestions: [],
        capabilities: [],
      },
      atlas: {
        inferred: ['A4'],
        confidence: 0.91,
        reasoning: 'test',
        classifier_version: 'claude-classifier-v0.1.0',
      },
      created_at: new Date().toISOString(),
    },
    { ex: 900 },
  )
}

function uuid(): string {
  return crypto.randomUUID()
}

async function main() {
  console.log('Step 7 verification — connecting…')
  console.log(`  Supabase: ${SUPABASE_URL}`)
  console.log(`  Dev base: ${DEV_BASE}`)

  const user = await ensureTestUser()
  await cleanupUserData(user)

  // Seed a public receipt + an unlisted receipt
  header('Seeding test receipts')
  const dpub = uuid()
  await stashRedisDraft(dpub, user, TEST_TITLE_PUBLIC)
  const pubResult = await publishProofReceipt({
    admin,
    user,
    draft: makeDraft({ title: TEST_TITLE_PUBLIC, visibility: 'public' }),
    draftId: dpub,
  })
  check('public receipt published', pubResult.success === true, pubResult)
  if (!pubResult.success) { console.log(JSON.stringify(pubResult, null, 2)); return }
  const publicSlug = pubResult.slug
  console.log(`  public slug: ${publicSlug}`)

  const dunl = uuid()
  await stashRedisDraft(dunl, user, TEST_TITLE_UNLISTED)
  const unlResult = await publishProofReceipt({
    admin,
    user,
    draft: makeDraft({ title: TEST_TITLE_UNLISTED, visibility: 'unlisted' }),
    draftId: dunl,
  })
  check('unlisted receipt published', unlResult.success === true, unlResult)
  if (!unlResult.success) return
  const unlistedSlug = unlResult.slug
  console.log(`  unlisted slug: ${unlistedSlug}`)

  // ── §8.1 Receipt HTML render ─────────────────────────────────────
  header('§8.1 — Receipt HTML render')
  const r1 = await fetch(`${DEV_BASE}/p/${publicSlug}`)
  check('HTTP 200', r1.status === 200, `got ${r1.status}`)
  const html1 = await r1.text()
  check('HTML contains title', html1.includes(TEST_TITLE_PUBLIC))
  check('HTML contains subject name "Step 7 Verify"', html1.includes('Step 7 Verify'))
  check('HTML contains atlas role A4', /\bA4\b/.test(html1))
  check('HTML contains verification badge', /L1.*Artifact Confirmed/i.test(html1))
  check('HTML contains stack chip claude-sonnet-4-6', html1.includes('claude-sonnet-4-6'))
  check('HTML head canonical link', html1.includes(`https://shipstacked.com/p/${publicSlug}`))
  check('HTML head OG image meta', /property="og:image"/.test(html1))
  // The layout injects a separate Organization JSON-LD script — walk all
  // ld+json scripts and pick the ProofReceipt one.
  const allLdJsonScripts = [...html1.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  check('HTML contains ≥1 JSON-LD script block', allLdJsonScripts.length >= 1, `count=${allLdJsonScripts.length}`)
  const receiptInline = allLdJsonScripts
    .map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
    .find((j) => Array.isArray(j?.['@type']) && j['@type'].includes('shipstacked:ProofReceipt'))
  check('inline ProofReceipt JSON-LD parses', !!receiptInline)
  if (receiptInline) {
    check('inline JSON-LD @id is canonical receipt URL', receiptInline['@id'] === `https://shipstacked.com/p/${publicSlug}`, receiptInline['@id'])
    check('inline JSON-LD has atlas roles array', Array.isArray(receiptInline['shipstacked:atlasRoles']) && receiptInline['shipstacked:atlasRoles'].length > 0)
  }

  // ── §8.2 Receipt JSON-LD content negotiation ────────────────────
  header('§8.2 — Receipt JSON-LD via Accept header + .json suffix')
  const r2a = await fetch(`${DEV_BASE}/p/${publicSlug}`, {
    headers: { Accept: 'application/ld+json' },
  })
  check('Accept ld+json status 200', r2a.status === 200, `got ${r2a.status}`)
  check('Accept ld+json content-type', /application\/ld\+json/.test(r2a.headers.get('content-type') ?? ''), r2a.headers.get('content-type'))
  const jsonA = await r2a.json()
  check('JSON-LD @id matches canonical', jsonA['@id'] === `https://shipstacked.com/p/${publicSlug}`, jsonA['@id'])
  check('JSON-LD identifier is ULID external_id', /^shipstacked:proof:/.test(jsonA.identifier ?? ''), jsonA.identifier)
  const atlasA4 = (jsonA['shipstacked:atlasRoles'] || []).find((r: { 'shipstacked:roleId': string }) => r['shipstacked:roleId'] === 'A4')
  check('atlas roles include A4 with @id pointing to /atlas/roles/A4?v=v0.4', atlasA4?.['@id'] === 'https://shipstacked.com/atlas/roles/A4?v=v0.4', atlasA4)

  const r2b = await fetch(`${DEV_BASE}/p/${publicSlug}.json`)
  check('.json suffix status 200', r2b.status === 200, `got ${r2b.status}`)
  check('.json content-type ld+json', /application\/ld\+json/.test(r2b.headers.get('content-type') ?? ''), r2b.headers.get('content-type'))
  const jsonB = await r2b.json()
  check('.json output equals Accept-header output', JSON.stringify(jsonA) === JSON.stringify(jsonB))

  // ── §8.3 Atlas role HTML render ─────────────────────────────────
  header('§8.3 — Atlas role HTML render (A4)')
  const r3 = await fetch(`${DEV_BASE}/atlas/roles/A4`)
  check('HTTP 200', r3.status === 200, `got ${r3.status}`)
  const html3 = await r3.text()
  check('HTML contains role name', html3.includes('Agent Workflow Implementer'))
  // React server-renders adjacent text + dynamic value with HTML comments
  // between them ("Cluster <!-- -->A<!-- -->"); allow that pattern.
  check('HTML shows cluster A', /Cluster\s*(?:<!-- -->)?\s*A\b/.test(html3))
  check('HTML shows atlas version v0.4', html3.includes('v0.4'))
  check('HTML shows crosswalks (ISCO-08)', /ISCO-08/.test(html3))
  check('HTML shows recent receipts section', /Recent receipts/i.test(html3))
  check('HTML head canonical includes ?v=v0.4', html3.includes('https://shipstacked.com/atlas/roles/A4?v=v0.4'))
  const atlasJsonLd = html3.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  check('HTML contains JSON-LD script block', !!atlasJsonLd)

  // ── §8.4 Atlas role JSON-LD content negotiation ─────────────────
  header('§8.4 — Atlas role JSON-LD')
  const r4a = await fetch(`${DEV_BASE}/atlas/roles/A4`, { headers: { Accept: 'application/ld+json' } })
  check('Accept ld+json status 200', r4a.status === 200, `got ${r4a.status}`)
  check('content-type ld+json', /application\/ld\+json/.test(r4a.headers.get('content-type') ?? ''))
  const role4a = await r4a.json()
  check('@id matches canonical with version', role4a['@id'] === 'https://shipstacked.com/atlas/roles/A4?v=v0.4', role4a['@id'])
  check('identifier = A4', role4a.identifier === 'A4')
  check('shipstacked:cluster = A', role4a['shipstacked:cluster'] === 'A')
  check('shipstacked:atlasVersion = v0.4', role4a['shipstacked:atlasVersion'] === 'v0.4')
  check('@type includes both DefinedTerm and shipstacked:AtlasRole',
    JSON.stringify(role4a['@type']) === JSON.stringify(['DefinedTerm', 'shipstacked:AtlasRole']))
  const containsOurReceipt = (role4a['shipstacked:recentReceipts'] || []).includes(`https://shipstacked.com/p/${publicSlug}`)
  check('recentReceipts contains our test receipt', containsOurReceipt, role4a['shipstacked:recentReceipts'])

  const r4b = await fetch(`${DEV_BASE}/atlas/roles/A4.json`)
  check('.json suffix status 200', r4b.status === 200, `got ${r4b.status}`)
  const role4b = await r4b.json()
  check('.json output equals Accept-header output', JSON.stringify(role4a) === JSON.stringify(role4b))

  // ── §8.5 Atlas v0.3 fallback ────────────────────────────────────
  header('§8.5 — Atlas v0.3 fallback')
  const r5a = await fetch(`${DEV_BASE}/atlas/roles/A4?v=v0.3`, { headers: { Accept: 'application/ld+json' } })
  check('A4?v=v0.3 status 200', r5a.status === 200, `got ${r5a.status}`)
  const role5a = await r5a.json()
  check('A4?v=v0.3 @id reflects v0.3', role5a['@id'] === 'https://shipstacked.com/atlas/roles/A4?v=v0.3', role5a['@id'])
  const r5b = await fetch(`${DEV_BASE}/atlas/roles/G1?v=v0.3`, { headers: { Accept: 'application/ld+json' } })
  check('G1?v=v0.3 → 404 (G1 only exists in v0.4)', r5b.status === 404, `got ${r5b.status}`)

  // ── §8.6 Visibility honoring ────────────────────────────────────
  header('§8.6 — Unlisted receipt')
  const r6 = await fetch(`${DEV_BASE}/p/${unlistedSlug}`)
  check('unlisted receipt HTTP 200', r6.status === 200, `got ${r6.status}`)
  const html6 = await r6.text()
  check('unlisted receipt has noindex meta', /name="robots"[^>]*noindex/.test(html6) || /<meta[^>]*content="noindex/i.test(html6))

  // ── §8.7 Receipts-at-role dereferencing loop ────────────────────
  header('§8.7 — Receipts ↔ Atlas dereferencing loop')
  // Start from the public receipt's JSON-LD, follow A4 ref, confirm
  // recentReceipts comes back with our slug.
  const stepA = await fetch(`${DEV_BASE}/p/${publicSlug}.json`).then((r) => r.json())
  const a4Ref = (stepA['shipstacked:atlasRoles'] || []).find((r: { 'shipstacked:roleId': string }) => r['shipstacked:roleId'] === 'A4')
  check('receipt JSON-LD has A4 ref with dereferenceable @id', !!a4Ref && typeof a4Ref['@id'] === 'string', a4Ref)
  if (a4Ref) {
    // Follow the @id (replace prod host with dev host for local test).
    const followUrl = a4Ref['@id'].replace('https://shipstacked.com', DEV_BASE)
    const stepB = await fetch(followUrl, { headers: { Accept: 'application/ld+json' } }).then((r) => r.json())
    check('followed @id returns Atlas role JSON-LD',
      stepB['@type']?.includes('shipstacked:AtlasRole'),
      stepB['@type'])
    const closedLoop = (stepB['shipstacked:recentReceipts'] || []).includes(`https://shipstacked.com/p/${publicSlug}`)
    check('Atlas role recentReceipts links back to our receipt — loop closed', closedLoop)
  }

  // ── §8.8 llms.txt ───────────────────────────────────────────────
  header('§8.8 — llms.txt')
  const r8 = await fetch(`${DEV_BASE}/llms.txt`)
  check('llms.txt HTTP 200', r8.status === 200, `got ${r8.status}`)
  check('llms.txt content-type text/plain', /text\/plain/.test(r8.headers.get('content-type') ?? ''))
  const llms = await r8.text()
  check('llms.txt mentions Cluster A', llms.includes('Cluster A'))
  check('llms.txt has at least one /atlas/roles/A1 link', llms.includes('/atlas/roles/A1'))
  check('llms.txt lists our public receipt', llms.includes(publicSlug))

  // ── Sample outputs (printed for spec review) ────────────────────
  header('Sample JSON-LD outputs')
  console.log('  --- Receipt JSON-LD (truncated) ---')
  console.log(JSON.stringify(jsonA, null, 2).split('\n').slice(0, 25).join('\n'))
  console.log('  --- Atlas role JSON-LD (truncated) ---')
  console.log(JSON.stringify(role4a, null, 2).split('\n').slice(0, 25).join('\n'))

  // ── Cleanup ─────────────────────────────────────────────────────
  header('Cleanup')
  await cleanupUserData(user)
  console.log('  test receipts + entity removed')

  console.log('')
  console.log(allPass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED — see above')
  process.exit(allPass ? 0 : 1)
}

main().catch((e) => {
  console.error('verification crashed:', e)
  process.exit(2)
})
