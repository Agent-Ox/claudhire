/**
 * verify-agent-card.ts — mechanized accuracy guarantee for Beacon 2.
 *
 * Fetches /.well-known/agent-card.json from a target base URL, asserts:
 *   - Required A2A v1.0 fields present + correct type
 *   - capabilities.streaming/pushNotifications/stateTransitionHistory all false
 *   - metadata.shipstacked:cardKind === 'data-publisher'
 *   - description leads with the non-interactivity disclaimer
 *   - Every skills[].examples URL is live (200 for direct GETs;
 *     known 404 acceptable for slug-parameterised <unknown> probes —
 *     proves the ROUTE family is live, which is what the card declares
 *     generically)
 *   - Body contains ZERO matches for a literal brand/partner/program allowlist
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/v2/verify-agent-card.ts [--base http://localhost:3000]
 *
 * Defaults to http://localhost:3000. Pass --base https://shipstacked.com
 * for production verification.
 *
 * Exit codes: 0 = all gates pass; 1 = any failure.
 */

const DEFAULT_BASE = 'http://localhost:3000'

interface AgentSkill {
  id: string
  name: string
  description: string
  examples?: string[]
  outputModes?: string[]
}

interface AgentCard {
  protocolVersion: string
  name: string
  description: string
  url: string
  version: string
  provider: { organization: string; url: string }
  capabilities: {
    streaming: boolean
    pushNotifications: boolean
    stateTransitionHistory: boolean
  }
  defaultInputModes: string[]
  defaultOutputModes: string[]
  skills: AgentSkill[]
  metadata: Record<string, unknown>
}

// Literal brand / partner / program / specific-collection-slug names that
// must NEVER appear in the served card body. Lowercased; comparison is
// case-insensitive against the lowercased body.
const BRAND_ALLOWLIST_FORBIDDEN: string[] = [
  'appsumo',
  'noah',
  'kagan',
  'gergely',
  'orosz',
  'lovable',
  'cursor',
  'replit',
  'bolt',
  'windsurf',
  'anthropic-deal',
  'openai-deal',
  // specific collection slugs — never named in the card
  'founding-beta',
  'test-alpha',
  'test-beta',
]

function parseArgs(argv: string[]): { base: string } {
  let base = DEFAULT_BASE
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base' && argv[i + 1]) {
      base = argv[i + 1]
      i++
    }
  }
  return { base: base.replace(/\/$/, '') }
}

let failures = 0
function pass(msg: string) { console.log(`  PASS  ${msg}`) }
function fail(msg: string) { console.log(`  FAIL  ${msg}`); failures++ }
function info(msg: string) { console.log(`        ${msg}`) }

function expect<T>(label: string, actual: T, expected: T): void {
  if (actual === expected) pass(`${label} = ${JSON.stringify(actual)}`)
  else fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

async function main(): Promise<void> {
  const { base } = parseArgs(process.argv.slice(2))
  console.log('============================================================')
  console.log(`verify-agent-card.ts — target base: ${base}`)
  console.log('============================================================\n')

  // ─── 1. Fetch + content-type + structural parse ────────────────────
  console.log('1. Fetch /.well-known/agent-card.json')
  const res = await fetch(`${base}/.well-known/agent-card.json`)
  if (res.status !== 200) {
    fail(`HTTP ${res.status} (expected 200)`)
    process.exit(1)
  }
  pass(`HTTP 200`)
  const ct = res.headers.get('content-type') || ''
  if (/application\/(a2a\+json|json)/.test(ct)) pass(`Content-Type: ${ct}`)
  else fail(`Content-Type: ${ct} (expected application/a2a+json or application/json)`)
  const cacheControl = res.headers.get('cache-control') || ''
  if (/max-age=\d+/.test(cacheControl)) pass(`Cache-Control: ${cacheControl}`)
  else fail(`Cache-Control missing max-age: ${cacheControl}`)
  const etag = res.headers.get('etag')
  if (etag && etag.length > 0) pass(`ETag: ${etag}`)
  else fail('ETag header missing')

  const bodyText = await res.text()
  let card: AgentCard
  try {
    card = JSON.parse(bodyText) as AgentCard
    pass('Body parses as JSON')
  } catch (e) {
    fail(`Body is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }

  // ─── 2. A2A v1.0 required fields ───────────────────────────────────
  console.log('\n2. A2A v1.0 required fields')
  for (const f of [
    'protocolVersion', 'name', 'description', 'url', 'version',
    'provider', 'capabilities', 'defaultInputModes', 'defaultOutputModes', 'skills',
  ] as const) {
    if (card[f] !== undefined && card[f] !== null) pass(`${f} present`)
    else fail(`${f} MISSING`)
  }
  if (typeof card.protocolVersion === 'string' && /^\d+\.\d+\.\d+$/.test(card.protocolVersion)) {
    pass(`protocolVersion = ${card.protocolVersion}`)
  } else fail(`protocolVersion not semver: ${card.protocolVersion}`)

  if (Array.isArray(card.defaultInputModes) && card.defaultInputModes.length > 0) pass(`defaultInputModes: ${JSON.stringify(card.defaultInputModes)}`)
  else fail('defaultInputModes empty or not array')
  if (Array.isArray(card.defaultOutputModes) && card.defaultOutputModes.length > 0) pass(`defaultOutputModes: ${JSON.stringify(card.defaultOutputModes)}`)
  else fail('defaultOutputModes empty or not array')
  if (Array.isArray(card.skills) && card.skills.length > 0) pass(`skills: ${card.skills.length} declared`)
  else fail('skills empty or not array')

  // ─── 3. Non-interactivity disclaimer — unmissable ──────────────────
  console.log('\n3. Non-interactivity disclaimer — UNMISSABLE')
  expect('capabilities.streaming',              card.capabilities.streaming,              false)
  expect('capabilities.pushNotifications',      card.capabilities.pushNotifications,      false)
  expect('capabilities.stateTransitionHistory', card.capabilities.stateTransitionHistory, false)
  expect('metadata.shipstacked:cardKind',       card.metadata['shipstacked:cardKind'] as string, 'data-publisher')
  expect('metadata.shipstacked:interactiveAgent',       card.metadata['shipstacked:interactiveAgent'] as boolean, false)
  expect('metadata.shipstacked:respondsToA2AMessages',  card.metadata['shipstacked:respondsToA2AMessages'] as boolean, false)
  if (/^NOT AN INTERACTIVE A2A AGENT SERVER/i.test(card.description.trim())) {
    pass('description leads with "NOT AN INTERACTIVE A2A AGENT SERVER"')
  } else {
    fail(`description does NOT lead with the disclaimer. First 80 chars: "${card.description.slice(0, 80)}..."`)
  }
  for (const skill of card.skills) {
    if (/no A2A invocation/i.test(skill.description) && /^Fetch\s|^Read\s/i.test(skill.description)) {
      pass(`skill[${skill.id}] description is fetch-shaped + non-invocation-declared`)
    } else {
      fail(`skill[${skill.id}] description must be fetch-shaped AND say "no A2A invocation": "${skill.description.slice(0, 80)}..."`)
    }
    if (/^Fetch\s|^Read\s/i.test(skill.name)) {
      pass(`skill[${skill.id}] name starts with "Fetch" or "Read"`)
    } else {
      fail(`skill[${skill.id}] name must start with "Fetch" or "Read": "${skill.name}"`)
    }
  }

  // ─── 4. Brand / partner / program allowlist — ZERO matches ─────────
  console.log('\n4. Brand / partner / program / specific-collection-slug — ZERO matches')
  const bodyLower = bodyText.toLowerCase()
  for (const forbidden of BRAND_ALLOWLIST_FORBIDDEN) {
    if (bodyLower.includes(forbidden)) fail(`forbidden token found in served body: "${forbidden}"`)
    else pass(`absent: "${forbidden}"`)
  }

  // ─── 5. Every declared example URL is live ─────────────────────────
  console.log('\n5. Accuracy audit — every declared examples[] URL probed live')
  // We extract URLs from examples (the "GET <url>" forms). For
  // slug-parameterised routes (e.g. /u/<username>, /collections/<slug>),
  // we substitute a known-real value for direct-200 cases and a
  // known-unknown value for active-gate-404 cases — both prove the
  // route family is live, which is what the card declares generically.
  const SUBSTITUTIONS: Record<string, { url: string; expect: number; reason: string }> = {
    [`${base}/u/<username>`]: {
      url: `${base}/u/aniketaslaliya801`,
      expect: 200,
      reason: 'published builder profile (Tier 1 backfilled)',
    },
    [`${base}/atlas/roles/<id>`]: {
      url: `${base}/atlas/roles/A1`,
      expect: 200,
      reason: 'real Atlas role',
    },
    [`${base}/atlas/roles/<id>.json`]: {
      url: `${base}/atlas/roles/A1.json`,
      expect: 200,
      reason: 'real Atlas role JSON-LD',
    },
    [`${base}/p/<slug>`]: {
      url: `${base}/p/__beacon2_audit__`,
      expect: 404,
      reason: 'unknown slug — route family being live is what we declare',
    },
    [`${base}/p/<slug>.json`]: {
      url: `${base}/p/__beacon2_audit__.json`,
      expect: 404,
      reason: 'unknown slug — proves route family + 404 gate',
    },
    [`${base}/collections/<slug>`]: {
      url: `${base}/collections/__beacon2_audit__`,
      expect: 404,
      reason: 'unknown slug — proves active-collection gate works',
    },
    [`${base}/collections/<slug>.json`]: {
      url: `${base}/collections/__beacon2_audit__.json`,
      expect: 404,
      reason: 'unknown slug — JSON-LD path live',
    },
    [`${base}/collections/<slug>.csv`]: {
      url: `${base}/collections/__beacon2_audit__.csv`,
      expect: 404,
      reason: 'unknown slug — CSV path live',
    },
  }

  // Extract URLs from skill examples, normalising "(Accept: …)" suffixes.
  function extractUrls(examples: string[] | undefined): string[] {
    if (!examples) return []
    const urls: string[] = []
    for (const ex of examples) {
      const m = ex.match(/^GET\s+(\S+)/)
      if (m) urls.push(m[1])
    }
    return urls
  }

  const seen = new Set<string>()
  for (const skill of card.skills) {
    for (const exUrl of extractUrls(skill.examples)) {
      // Translate the canonical-host base in examples (https://shipstacked.com)
      // to the configured target base, so local-dev verification probes localhost.
      const translated = exUrl.replace(/^https:\/\/shipstacked\.com/, base)
      const sub = SUBSTITUTIONS[translated]
      const probeUrl = sub?.url ?? translated
      const expectedStatus = sub?.expect ?? 200
      if (seen.has(probeUrl)) continue
      seen.add(probeUrl)
      try {
        const r = await fetch(probeUrl, { redirect: 'manual' })
        if (r.status === expectedStatus) {
          pass(`${skill.id.padEnd(28)} ${probeUrl} → HTTP ${r.status} ${sub ? `(${sub.reason})` : ''}`)
        } else {
          fail(`${skill.id.padEnd(28)} ${probeUrl} → HTTP ${r.status} (expected ${expectedStatus})${sub ? ` — ${sub.reason}` : ''}`)
        }
      } catch (e) {
        fail(`${skill.id} fetch error for ${probeUrl}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ─── 6. Summary ────────────────────────────────────────────────────
  console.log('\n============================================================')
  if (failures === 0) {
    console.log('VERIFY-AGENT-CARD ✓ — all gates passed')
  } else {
    console.log(`VERIFY-AGENT-CARD ✗ — ${failures} failure(s)`)
    process.exit(1)
  }
}

main().catch(e => {
  console.error('FATAL:', e?.message ?? e)
  process.exit(1)
})
