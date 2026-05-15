/**
 * Verification harness for Step 6 publish API.
 *
 * Run: node --env-file=.env.local scripts/v2/verify-step-6.ts
 *
 * Covers the §7 scenarios from STEP_6_PUBLISH_API_SPEC:
 *   1. Direct publish — DB state correct + ingestion_log + verification_events
 *   2. Auto-entity-creation reuse — second publish, same user, same entity
 *   3. Slug collision — duplicate title → `-2` suffix
 *   4. Auth failure — HTTP 401 from /api/paste/publish with no cookie
 *   5. Expired draft (HTTP) — draft_id not in Redis → 400 draft_expired
 *   6. Idempotency — Redis draft deleted on publish; replay → draft_expired
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { publishProofReceipt, type PasteDraft } from '../../src/lib/paste/publish.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEV_BASE = process.env.STEP6_DEV_BASE || 'http://localhost:3000'

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TEST_EMAIL = 'step6-verify@shipstacked.test'
const TEST_PASSWORD = 'StepSix!Verify_2026'
const TEST_TITLE = `Verify run ${new Date().toISOString().slice(0, 19)}`

let allPass = true
function check(label: string, ok: boolean, detail?: unknown) {
  const icon = ok ? '✓' : '✗'
  console.log(`  ${icon} ${label}` + (detail !== undefined ? `  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''))
  if (!ok) allPass = false
}

function header(s: string) {
  console.log(`\n──── ${s} ────`)
}

async function ensureTestUser(): Promise<User> {
  // Try create; on already-exists, look up.
  const create = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Step 6 Verify' },
  })
  if (create.data?.user) return create.data.user
  // List users and find by email.
  const { data: list } = await admin.auth.admin.listUsers()
  const found = list?.users?.find((u) => u.email === TEST_EMAIL)
  if (!found) throw new Error('could not create or find test user')
  return found
}

async function cleanupExistingTestData(user: User) {
  // Remove receipts + entity from any prior verification run. ON DELETE
  // CASCADE handles verification_events; ingestion_log keeps a row with
  // receipt_id set to null after the FK ON DELETE SET NULL. Capabilities
  // counters are intentionally left (analytics, not test fixtures).
  const { data: entities } = await admin
    .from('entities')
    .select('id')
    .eq('owner_user_id', user.id)
  if (entities && entities.length > 0) {
    const entityIds = entities.map((e) => e.id as number)
    await admin.from('proof_receipts').delete().in('subject_id', entityIds)
    await admin.from('entities').delete().in('id', entityIds)
  }
}

function makeDraft(overrides: Partial<PasteDraft> = {}): PasteDraft {
  return {
    url: 'https://github.com/anthropics/claude-code',
    source: 'github',
    event_type: 'published_repo',
    title: TEST_TITLE,
    description: 'Verification synthetic draft.\n\n- Item one\n- Item two',
    occurred_at: new Date().toISOString(),
    occurred_at_precision: 'day',
    artifacts: [
      { kind: 'repo', url: 'https://github.com/anthropics/claude-code', title: 'anthropics/claude-code' },
    ],
    stack: [
      { name: 'claude-sonnet-4-6', category: 'model', role: 'primary' },
      { name: 'anthropic-sdk', category: 'framework', role: 'primary' },
    ],
    outcomes: [],
    capabilities: ['agent-loop', 'tool-use', 'verification-marker'],
    atlas_roles_confirmed: ['A4', 'B2'],
    atlas_roles_claimed: [],
    atlas_roles_inferred: ['A4', 'B2'],
    atlas_confidence: 0.91,
    classifier_version: 'claude-classifier-v0.1.0',
    classifier_reasoning: 'Synthetic test reasoning.',
    classifier_reachable: true,
    visibility: 'public',
    wanted_attestation: false,
    ...overrides,
  }
}

async function stashRedisDraft(draftId: string, user: User) {
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
        title_draft: TEST_TITLE,
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
  // crypto.randomUUID is available in modern Node.
  return crypto.randomUUID()
}

async function main() {
  console.log('Step 6 verification — connecting…')
  console.log(`  Supabase: ${SUPABASE_URL}`)
  console.log(`  Dev base: ${DEV_BASE}`)

  const user = await ensureTestUser()
  console.log(`  Test user: ${user.email} (${user.id})`)
  await cleanupExistingTestData(user)

  // ── Scenario 1: direct publish ────────────────────────────────────
  header('Scenario 1 — direct publish')
  const draftId1 = uuid()
  await stashRedisDraft(draftId1, user)
  const result1 = await publishProofReceipt({
    admin,
    user,
    draft: makeDraft(),
    draftId: draftId1,
    requestId: 'verify-1',
  })
  check('publish returns success', result1.success === true, result1)
  if (!result1.success) { console.log(JSON.stringify(result1, null, 2)); return }
  const receiptId = result1.receipt_db_id
  const slug1 = result1.slug

  check('canonical_url shape', /^https:\/\/shipstacked\.com\/p\//.test(result1.canonical_url), result1.canonical_url)
  check('id ulid shape', /^shipstacked:proof:[0-9A-HJKMNP-TV-Z]{26}$/.test(result1.id), result1.id)
  check('verification_level = L1', result1.verification_level === 'L1_artifact_confirmed', result1.verification_level)

  const { data: receiptRow } = await admin
    .from('proof_receipts')
    .select('id, slug, external_id, title, atlas_confirmed, ingestion_source, ingestion_metadata, verification_level, capabilities')
    .eq('id', receiptId)
    .single()
  check('receipt row exists', !!receiptRow)
  check('receipt.slug matches', receiptRow?.slug === slug1)
  check('receipt.atlas_confirmed = [A4, B2]', JSON.stringify(receiptRow?.atlas_confirmed) === JSON.stringify(['A4', 'B2']))
  check('receipt.ingestion_source = paste', receiptRow?.ingestion_source === 'paste')
  check('receipt.ingestion_metadata.embed_card_url set', !!(receiptRow?.ingestion_metadata as Record<string, unknown> | null)?.embed_card_url)

  const { data: verEvents } = await admin
    .from('verification_events')
    .select('id, level, method')
    .eq('receipt_id', receiptId)
  check('verification_events row count = 1', verEvents?.length === 1, verEvents?.length)
  check('verification_events.level = L1', verEvents?.[0]?.level === 'L1_artifact_confirmed')

  const { data: ingestion } = await admin
    .from('ingestion_log')
    .select('id, source, status, source_url, request_id')
    .eq('receipt_id', receiptId)
  check('ingestion_log row count = 1', ingestion?.length === 1, ingestion?.length)
  check('ingestion_log.status = published', ingestion?.[0]?.status === 'published')
  check('ingestion_log.request_id propagated', ingestion?.[0]?.request_id === 'verify-1')

  // capabilities_vocab should have the synthetic tag with count ≥ 1
  const { data: capRow } = await admin
    .from('capabilities_vocab')
    .select('tag, receipt_count')
    .eq('tag', 'verification-marker')
    .maybeSingle()
  check('capabilities_vocab.verification-marker present', !!capRow, capRow)

  // Redis cleanup
  const draft1AfterPublish = await redis.get(`paste-draft:${draftId1}`)
  check('Redis draft deleted on publish', draft1AfterPublish == null)

  // ── Scenario 2: auto-entity reuse ─────────────────────────────────
  header('Scenario 2 — auto-entity-creation reuses on second publish')
  const draftId2 = uuid()
  await stashRedisDraft(draftId2, user)
  const result2 = await publishProofReceipt({
    admin,
    user,
    draft: makeDraft({ title: `${TEST_TITLE} two` }),
    draftId: draftId2,
  })
  check('second publish succeeds', result2.success === true, result2)

  const { data: entitiesForUser } = await admin
    .from('entities')
    .select('id, slug')
    .eq('owner_user_id', user.id)
  check('exactly ONE entity for the test user', entitiesForUser?.length === 1, entitiesForUser?.length)

  // ── Scenario 3: slug collision ────────────────────────────────────
  header('Scenario 3 — slug collision adds -2 suffix')
  const draftId3 = uuid()
  await stashRedisDraft(draftId3, user)
  const result3 = await publishProofReceipt({
    admin,
    user,
    draft: makeDraft(),   // same TEST_TITLE as scenario 1
    draftId: draftId3,
  })
  check('third publish succeeds', result3.success === true, result3)
  if (result3.success) {
    check('slug ends with -2', /-2$/.test(result3.slug), result3.slug)
  }

  // ── Scenario 4: HTTP auth gate ────────────────────────────────────
  header('Scenario 4 — HTTP POST without auth → 401')
  try {
    const res = await fetch(`${DEV_BASE}/api/paste/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: uuid(), draft: makeDraft() }),
    })
    check('HTTP status = 401', res.status === 401, `got ${res.status}`)
    const body = await res.json().catch(() => ({}))
    check('error = unauthenticated', body?.error === 'unauthenticated', body)
  } catch (e) {
    check('curl succeeded', false, e instanceof Error ? e.message : String(e))
  }

  // ── Scenario 5: HTTP draft_expired ────────────────────────────────
  // Requires auth to reach the body validation. Build a session cookie for
  // the test user via Supabase auth REST, then format it as @supabase/ssr
  // expects: cookie name sb-<projectref>-auth-token, value base64-<base64 JSON>.
  header('Scenario 5 — HTTP POST with expired draft_id → 400 draft_expired')
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const tokenJson = await tokenResp.json()
  if (!tokenJson?.access_token) {
    check('signed in as test user', false, tokenJson)
  } else {
    const sessionPayload = {
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_in: tokenJson.expires_in,
      expires_at: tokenJson.expires_at,
      token_type: tokenJson.token_type,
      user: tokenJson.user,
    }
    const cookieValue = 'base64-' + Buffer.from(JSON.stringify(sessionPayload)).toString('base64')
    const expiredDraftId = uuid()
    const res5 = await fetch(`${DEV_BASE}/api/paste/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${cookieName}=${cookieValue}`,
      },
      body: JSON.stringify({ draft_id: expiredDraftId, draft: makeDraft() }),
    })
    const body5 = await res5.json().catch(() => ({}))
    check('HTTP status = 400', res5.status === 400, `got ${res5.status}`)
    check('error = draft_expired', body5?.error === 'draft_expired', body5)

    // ── Scenario 6: idempotency via Redis delete ────────────────────
    header('Scenario 6 — HTTP replay of a published draft_id → 400 draft_expired')
    const draftId6 = uuid()
    await stashRedisDraft(draftId6, user)
    const res6a = await fetch(`${DEV_BASE}/api/paste/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${cookieName}=${cookieValue}`,
      },
      body: JSON.stringify({ draft_id: draftId6, draft: makeDraft({ title: `${TEST_TITLE} idempotent` }) }),
    })
    const body6a = await res6a.json()
    check('first publish HTTP 200', res6a.status === 200, `got ${res6a.status}`)
    check('first publish success=true', body6a?.success === true, body6a)

    const res6b = await fetch(`${DEV_BASE}/api/paste/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${cookieName}=${cookieValue}`,
      },
      body: JSON.stringify({ draft_id: draftId6, draft: makeDraft({ title: `${TEST_TITLE} idempotent` }) }),
    })
    const body6b = await res6b.json()
    check('replay HTTP 400', res6b.status === 400, `got ${res6b.status}`)
    check('replay error = draft_expired', body6b?.error === 'draft_expired', body6b)
  }

  // ── Final cleanup ────────────────────────────────────────────────
  header('Cleanup')
  await cleanupExistingTestData(user)
  // Optional: leave capabilities_vocab counter increments alone — they're
  // not test fixtures. Leave the test user as well so re-runs are fast.
  console.log('  receipts + entity removed')

  console.log('')
  console.log(allPass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED — see above')
  process.exit(allPass ? 0 : 1)
}

main().catch((e) => {
  console.error('verification crashed:', e)
  process.exit(2)
})
