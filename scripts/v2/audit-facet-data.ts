// Batch 8 facet data-variety audit (read-only). Implements the §G audit from
// DISCOVERY_batch6_talent_facets.md in JS (PostgREST can't run unnest/jsonb_agg),
// reporting BUILDER counts per facet value (a facet is only useful if enough
// distinct builders carry the value — not just receipts).
//
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-facet-data.ts

import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const CLUSTER_NAME: Record<string, string> = {
  A: 'workforce', B: 'operations', C: 'compliance', D: 'design',
  E: 'enablement', F: 'operators', G: 'practitioners',
}

const [{ data: profiles }, { data: receipts }] = await Promise.all([
  admin.from('profiles').select('id, entity_id, primary_profession, availability, verified').eq('published', true),
  admin.from('proof_receipts')
    .select('subject_id, atlas_inferred, atlas_confirmed, verification_level, event_type, stack, capabilities')
    .eq('visibility', 'public'),
])

const pubs = profiles ?? []
const recs = (receipts ?? []) as any[]
const entityToProfile = new Map<string, string>()
for (const p of pubs) if (p.entity_id != null) entityToProfile.set(String(p.entity_id), p.id)

const linked = pubs.filter(p => p.entity_id != null).length
console.log(`\nPUBLISHED PROFILES: ${pubs.length}  (linked to entity: ${linked}, unlinked: ${pubs.length - linked})`)
console.log(`PUBLIC RECEIPTS: ${recs.length}`)

// Builders with >=1 public receipt
const buildersWithReceipts = new Set<string>()
for (const r of recs) { const pid = entityToProfile.get(String(r.subject_id)); if (pid) buildersWithReceipts.add(pid) }
console.log(`BUILDERS WITH >=1 RECEIPT (receipt-filterable): ${buildersWithReceipts.size} of ${pubs.length}`)

// Generic facet tabulator: value -> {receipts, builders:Set}
function tally(extract: (r: any) => string[]) {
  const m = new Map<string, { receipts: number; builders: Set<string> }>()
  for (const r of recs) {
    const pid = entityToProfile.get(String(r.subject_id))
    for (const v of extract(r)) {
      if (!v) continue
      const e = m.get(v) ?? { receipts: 0, builders: new Set<string>() }
      e.receipts++; if (pid) e.builders.add(pid)
      m.set(v, e)
    }
  }
  return [...m.entries()].map(([v, e]) => ({ value: v, receipts: e.receipts, builders: e.builders.size }))
    .sort((a, b) => b.builders - a.builders || b.receipts - a.receipts)
}

function show(title: string, rows: { value: string; receipts: number; builders: number }[], limit = 25) {
  console.log(`\n=== ${title} (value · builders · receipts) ===`)
  if (!rows.length) { console.log('  (none)'); return }
  for (const r of rows.slice(0, limit)) console.log(`  ${r.value.padEnd(28)} ${String(r.builders).padStart(3)}  ${String(r.receipts).padStart(4)}`)
}

const asArr = (x: any): string[] => Array.isArray(x) ? x : []

show('ATLAS ROLE (atlas_inferred)', tally(r => asArr(r.atlas_inferred)))
show('ATLAS CLUSTER (atlas_inferred → first letter)', tally(r => [...new Set(asArr(r.atlas_inferred).map((id: string) => id?.[0]).filter(Boolean))].map(c => `${c} (${CLUSTER_NAME[c] ?? '?'})`)))
show('ATLAS ROLE (atlas_confirmed)', tally(r => asArr(r.atlas_confirmed)))
show('VERIFICATION LEVEL', tally(r => [r.verification_level].filter(Boolean)))
show('EVENT TYPE', tally(r => [r.event_type].filter(Boolean)))
show('STACK (element names)', tally(r => asArr(r.stack).map((s: any) => s?.name).filter(Boolean)))
show('CAPABILITIES', tally(r => asArr(r.capabilities)))

// Profile-side facets (already filterable today)
function profileTally(key: 'primary_profession' | 'availability') {
  const m = new Map<string, number>()
  for (const p of pubs) { const v = p[key] || '(null)'; m.set(v, (m.get(v) ?? 0) + 1) }
  return [...m.entries()].map(([value, builders]) => ({ value, builders, receipts: 0 })).sort((a, b) => b.builders - a.builders)
}
show('PRIMARY_PROFESSION (profile-side, existing facet)', profileTally('primary_profession'))
show('AVAILABILITY (profile-side, existing facet)', profileTally('availability'))
console.log('')
