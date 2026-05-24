// Batch 8 facet verification (read-only). Exercises the real code path
// (getRankedBuilders → atlasClusters/eventTypes → facet filters) against live
// data, confirming the §H acceptance criteria.
//
//   node --env-file=.env.local --experimental-strip-types scripts/v2/verify-facets.ts

import { getRankedBuilders } from '../../src/lib/ranking/get-ranked-builders.ts'
import { CLUSTER_LABELS, CLUSTER_ORDER, SHIPPED_BUCKETS, bucketsForEvents } from '../../src/lib/ranking/facets.ts'

const { ranked, belowThreshold } = await getRankedBuilders()
const all = [...ranked, ...belowThreshold]
console.log(`total builders: ${all.length}`)

console.log('\nCLUSTER facet (builders):')
for (const c of CLUSTER_ORDER) {
  const n = all.filter((p: any) => (p.atlasClusters || []).includes(c)).length
  if (n) console.log(`  ${CLUSTER_LABELS[c].padEnd(16)} (${c}): ${n}`)
}

console.log('\nSHIPPED facet (builders):')
for (const b of SHIPPED_BUCKETS) {
  const n = all.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes(b.key)).length
  if (n) console.log(`  ${b.label.padEnd(8)} (${b.key}): ${n}`)
}

const F = all.filter((p: any) => (p.atlasClusters || []).includes('F'))
const agents = all.filter((p: any) => bucketsForEvents(p.eventTypes || []).includes('shipped_agent'))
const combo = all.filter((p: any) => (p.atlasClusters || []).includes('F') && bucketsForEvents(p.eventTypes || []).includes('shipped_app'))

console.log('\nACCEPTANCE:')
console.log(`  ?cluster=F (Operators): ${F.length} builders`)
console.log(`  ?shipped=shipped_agent (Agents): ${agents.length} → ${agents.map((p: any) => p.username).join(', ')}`)
console.log(`  ?cluster=F&shipped=shipped_app (intersect): ${combo.length} → ${combo.map((p: any) => p.username).join(', ')}`)
console.log('')
