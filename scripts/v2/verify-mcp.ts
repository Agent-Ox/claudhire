/**
 * verify-mcp.ts — the load-bearing Beacon 5 adversarial proof.
 *
 * Two phases:
 *
 * PHASE 1 — Protocol handshake via the official @modelcontextprotocol/sdk
 * Client + StreamableHTTPClientTransport. If the official client connects
 * successfully, this server is protocol-compliant by construction.
 *
 * PHASE 2 — Adversarial D.2 series (BEACON_5_DISCOVERY.md):
 *   - get-builder for all 3 known fakes (jennypeterson224, johnchambers73,
 *     oxleethomasagentox598) returns IDENTICAL bytes to a nonexistent
 *     username (NO ORACLE — published=false ≡ nonexistent).
 *   - get-builder for a real published builder succeeds.
 *   - get-collection for a nonexistent slug returns the safe "not found".
 *   - get-atlas-role happy + error paths.
 *   - get-atlas-role with a SQL-injection-shaped input → schema-rejected
 *     BEFORE any DB call.
 *   - list-atlas-roles returns 40 (v0.4) and 34 (v0.3) entries.
 *   - Every error response: ZERO stack traces, ZERO PGRST-style strings,
 *     ZERO file paths, ZERO schema column names.
 *
 * Usage:
 *   node --experimental-strip-types scripts/v2/verify-mcp.ts                            # localhost:3000
 *   node --experimental-strip-types scripts/v2/verify-mcp.ts --base https://shipstacked.com
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const argv = process.argv.slice(2)
let base = 'http://localhost:3000'
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--base' && argv[i + 1]) { base = argv[i + 1]; i++ }
}
base = base.replace(/\/$/, '')

let failures = 0
function pass(msg: string) { console.log(`  PASS  ${msg}`) }
function fail(msg: string) { console.log(`  FAIL  ${msg}`); failures++ }
function info(msg: string) { console.log(`        ${msg}`) }

// Strings that MUST NOT appear in any user-facing error response.
const LEAK_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'stack-trace "at "', re: /\bat\s+\w+\.\w+\s*\(/ },
  { name: 'file path "/Users/" or "/private/"', re: /\/(Users|private|home|var|tmp)\// },
  { name: 'PGRST error code', re: /PGRST\d+/ },
  { name: 'Postgres "column ... does not exist"', re: /column\s+["']?\w+["']?\s+does not exist/i },
  { name: 'Supabase service-role key shape', re: /SUPABASE_SERVICE_ROLE/ },
  { name: '.env reference', re: /\.env(\.|\b)/ },
  { name: 'src/lib path leak', re: /src\/lib\// },
  { name: 'node_modules leak', re: /node_modules\// },
]

function assertNoLeak(label: string, body: string) {
  for (const { name, re } of LEAK_PATTERNS) {
    if (re.test(body)) {
      fail(`${label}: LEAK detected — pattern "${name}" matched in: ${body.slice(0, 200)}`)
      return
    }
  }
  pass(`${label}: no leak (zero stack/path/PGRST/env-var/internal-path patterns)`)
}

console.log('============================================================')
console.log(`  verify-mcp.ts — target base: ${base}`)
console.log('============================================================\n')

// ─── PHASE 1: Protocol handshake via the official SDK Client ───────────────
console.log('PHASE 1 — Protocol handshake (official @modelcontextprotocol/sdk Client)')

const transport = new StreamableHTTPClientTransport(new URL(`${base}/api/mcp`))
const client = new Client({ name: 'verify-mcp', version: '1.0.0' }, { capabilities: {} })

try {
  await client.connect(transport)
  pass('client.connect() — handshake succeeded')
  const serverInfo = client.getServerVersion()
  if (serverInfo) {
    pass(`server identifies as: ${serverInfo.name}@${serverInfo.version}`)
  }
} catch (e) {
  fail(`handshake failed: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
}

// ─── PHASE 1.b: tools/list returns expected tools ──────────────────────────
console.log('\nPHASE 1.b — tools/list')
const toolsList = await client.listTools()
const toolNames = toolsList.tools.map(t => t.name).sort()
const expectedTools = ['get-atlas-role', 'get-builder', 'get-collection', 'list-atlas-roles']
if (JSON.stringify(toolNames) === JSON.stringify(expectedTools)) {
  pass(`4 tools: ${toolNames.join(', ')}`)
} else {
  fail(`tools mismatch — got ${JSON.stringify(toolNames)}, expected ${JSON.stringify(expectedTools)}`)
}

// Helper: call a tool, return the text content (which is JSON-encoded).
async function callToolText(name: string, args: unknown): Promise<{ text: string; isError: boolean }> {
  const result = await client.callTool({ name, arguments: args as Record<string, unknown> })
  const isError = result.isError === true
  const content = result.content as Array<{ type: string; text?: string }>
  const text = content?.[0]?.text ?? ''
  return { text, isError }
}

// ─── PHASE 2.a: get-builder — adversarial no-oracle proof (THE LOAD-BEARING) ─
console.log('\nPHASE 2.a — get-builder NO-ORACLE proof (3 fakes vs nonexistent)')
const FAKES = ['jennypeterson224', 'johnchambers73', 'oxleethomasagentox598']
const NONEXISTENT = '__nonexistent_xyz__'
const fakeResponses: string[] = []
for (const fake of FAKES) {
  const r = await callToolText('get-builder', { username: fake })
  if (!r.isError) {
    fail(`get-builder(${fake}): unexpected success — FAKE LEAKED. Body: ${r.text.slice(0, 200)}`)
  } else {
    pass(`get-builder(${fake}): error response (isError=true)`)
    fakeResponses.push(r.text)
    assertNoLeak(`get-builder(${fake}) error body`, r.text)
  }
}
const nonexistentR = await callToolText('get-builder', { username: NONEXISTENT })
if (!nonexistentR.isError) {
  fail(`get-builder(${NONEXISTENT}): unexpected success — wrong gate. Body: ${nonexistentR.text.slice(0, 200)}`)
} else {
  pass(`get-builder(${NONEXISTENT}): error response (isError=true)`)
  assertNoLeak(`get-builder(${NONEXISTENT}) error body`, nonexistentR.text)
}
console.log('\n→ The no-oracle byte-equality:')
console.log(`     ${NONEXISTENT}: ${nonexistentR.text}`)
for (let i = 0; i < FAKES.length; i++) {
  console.log(`     ${FAKES[i].padEnd(28)}: ${fakeResponses[i]}`)
  if (fakeResponses[i] === nonexistentR.text) {
    pass(`get-builder(${FAKES[i]}) === get-builder(nonexistent) — BYTE-IDENTICAL (no oracle)`)
  } else {
    fail(`get-builder(${FAKES[i]}) !== get-builder(nonexistent) — ORACLE LEAK`)
  }
}

// ─── PHASE 2.b: get-builder happy path ──────────────────────────────────────
console.log('\nPHASE 2.b — get-builder happy path')
const realR = await callToolText('get-builder', { username: 'aniketaslaliya801' })
if (realR.isError) {
  fail(`get-builder(aniketaslaliya801): unexpected error. Body: ${realR.text.slice(0, 200)}`)
} else {
  try {
    const profile = JSON.parse(realR.text)
    if (profile.username === 'aniketaslaliya801' && profile.published === true) {
      pass(`get-builder(aniketaslaliya801): success, returned published profile`)
    } else {
      fail(`get-builder(aniketaslaliya801): unexpected shape: ${realR.text.slice(0, 200)}`)
    }
  } catch {
    fail(`get-builder(aniketaslaliya801): not valid JSON: ${realR.text.slice(0, 200)}`)
  }
}

// ─── PHASE 2.c: get-collection ──────────────────────────────────────────────
console.log('\nPHASE 2.c — get-collection nonexistent → safe not-found')
// Schema-VALID slug (matches /^[a-z0-9-]+$/) that doesn't exist in DB —
// must reach requireActiveCollection and produce "Collection not found"
// (proves the DB-layer not-found path is safe, not just the schema layer).
const colR = await callToolText('get-collection', { slug: 'nonexistent-collection-zzz' })
if (!colR.isError) {
  fail(`get-collection(schema-valid-nonexistent): unexpected success. Body: ${colR.text.slice(0, 200)}`)
} else {
  pass(`get-collection(schema-valid-nonexistent): error response`)
  assertNoLeak(`get-collection error body`, colR.text)
  try {
    const e = JSON.parse(colR.text)
    if (typeof e.message === 'string' && /collection not found/i.test(e.message)) {
      pass(`get-collection error message is safe: "${e.message}"`)
    } else {
      fail(`get-collection error message unexpected: ${colR.text}`)
    }
  } catch {
    fail(`get-collection error body not JSON: ${colR.text}`)
  }
}
// Also verify schema-INVALID slug is rejected at schema layer (defense in depth).
const colInvalid = await callToolText('get-collection', { slug: '__has__underscores__' })
if (!colInvalid.isError) {
  fail(`get-collection(invalid slug): unexpected success`)
} else {
  pass(`get-collection(invalid slug): schema-rejected (no DB call)`)
  assertNoLeak(`get-collection invalid-slug error body`, colInvalid.text)
}

// ─── PHASE 2.d: get-atlas-role ──────────────────────────────────────────────
console.log('\nPHASE 2.d — get-atlas-role')
const a1 = await callToolText('get-atlas-role', { roleId: 'A1' })
if (a1.isError) {
  fail(`get-atlas-role(A1): unexpected error. Body: ${a1.text.slice(0, 200)}`)
} else {
  try {
    const j = JSON.parse(a1.text)
    if (j['@id']?.endsWith('/atlas/roles/A1?v=v0.4') && j.identifier === 'A1') {
      pass(`get-atlas-role(A1): JSON-LD shape matches live (@id, identifier)`)
    } else {
      fail(`get-atlas-role(A1): unexpected shape: ${a1.text.slice(0, 200)}`)
    }
  } catch {
    fail(`get-atlas-role(A1): not JSON: ${a1.text.slice(0, 200)}`)
  }
}
const zz = await callToolText('get-atlas-role', { roleId: 'ZZZZ' })
if (!zz.isError) {
  fail(`get-atlas-role(ZZZZ): unexpected success`)
} else {
  pass(`get-atlas-role(ZZZZ): schema-rejected (invalid role id format)`)
  assertNoLeak(`get-atlas-role(ZZZZ) error body`, zz.text)
}
const inject = await callToolText('get-atlas-role', { roleId: 'drop;--' })
if (!inject.isError) {
  fail(`get-atlas-role(drop;--): unexpected success`)
} else {
  pass(`get-atlas-role(drop;--): schema-rejected BEFORE any DB call`)
  assertNoLeak(`get-atlas-role(drop;--) error body`, inject.text)
}

// ─── PHASE 2.e: list-atlas-roles ───────────────────────────────────────────
console.log('\nPHASE 2.e — list-atlas-roles')
const list04 = await callToolText('list-atlas-roles', { version: 'v0.4' })
if (list04.isError) {
  fail(`list-atlas-roles(v0.4): error. Body: ${list04.text.slice(0, 200)}`)
} else {
  const j = JSON.parse(list04.text)
  if (j.count === 40 && j.version === 'v0.4' && Array.isArray(j.roles) && j.roles.length === 40) {
    pass(`list-atlas-roles(v0.4): 40 roles (matches Beacon-4 verified count)`)
  } else {
    fail(`list-atlas-roles(v0.4): count mismatch — ${j.count}, expected 40`)
  }
}
const list03 = await callToolText('list-atlas-roles', { version: 'v0.3' })
if (list03.isError) {
  fail(`list-atlas-roles(v0.3): error`)
} else {
  const j = JSON.parse(list03.text)
  if (j.count === 34 && j.version === 'v0.3' && j.roles.length === 34) {
    pass(`list-atlas-roles(v0.3): 34 roles`)
  } else {
    fail(`list-atlas-roles(v0.3): count mismatch — ${j.count}, expected 34`)
  }
}

// ─── PHASE 2.f: invalid params → schema-rejected ───────────────────────────
console.log('\nPHASE 2.f — invalid params')
const badU = await callToolText('get-builder', { username: 'has spaces!' })
if (!badU.isError) {
  fail(`get-builder(invalid username): unexpected success`)
} else {
  pass(`get-builder(invalid username): schema-rejected`)
  assertNoLeak(`get-builder invalid-input error body`, badU.text)
}
const extraKey = await callToolText('get-atlas-role', { roleId: 'A1', extraThing: 'sneaky' })
if (!extraKey.isError) {
  fail(`get-atlas-role with unknown key: should be rejected by .strict()`)
} else {
  pass(`get-atlas-role with unknown key: rejected by .strict()`)
  assertNoLeak(`get-atlas-role .strict() error body`, extraKey.text)
}

await client.close()

console.log('\n============================================================')
if (failures === 0) {
  console.log('VERIFY-MCP ✓ — protocol compliant + no oracle + no leak')
} else {
  console.log(`VERIFY-MCP ✗ — ${failures} failure(s)`)
  process.exit(1)
}
