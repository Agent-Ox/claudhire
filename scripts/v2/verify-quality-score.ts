// Formula E ranking verification (Batch 7b). Read-only: computes Formula E
// against live data, prints the ranking + per-builder signal breakdown + the
// §H acceptance spot-checks. No writes. Uses SUPABASE_SERVICE_ROLE_KEY.
//
//   node --env-file=.env.local --experimental-strip-types scripts/v2/verify-quality-score.ts

import { createClient } from '@supabase/supabase-js'
import {
  computeQualityScore, l1HostStats, medianConfidence, l1Ratio, eventDiversity, recency,
  type ReceiptForScoring,
} from '../../src/lib/ranking/quality-score.ts'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const [{ data: profiles }, { data: receipts }] = await Promise.all([
  admin.from('profiles').select('id, username, verified, featured, entity_id').eq('published', true),
  admin.from('proof_receipts').select('subject_id, atlas_confidence, verification_level, event_type, artifacts, issued_at').eq('visibility', 'public'),
])

const byEntity = new Map<string, ReceiptForScoring[]>()
for (const r of (receipts ?? []) as any[]) {
  const k = String(r.subject_id)
  const rec: ReceiptForScoring = {
    atlas_confidence: r.atlas_confidence ?? null, verification_level: r.verification_level ?? null,
    event_type: r.event_type ?? null, artifacts: Array.isArray(r.artifacts) ? r.artifacts : null, issued_at: r.issued_at ?? null,
  }
  byEntity.get(k)?.push(rec) ?? byEntity.set(k, [rec])
}

const rows = (profiles ?? []).map((p: any) => {
  const rs = p.entity_id != null ? byEntity.get(String(p.entity_id)) ?? [] : []
  const r = computeQualityScore(rs, { featured: !!p.featured })
  const { distinctHosts, effectiveReceipts } = l1HostStats(rs)
  return {
    username: p.username, verified: !!p.verified, score: r.score, ranked: r.ranked,
    receipts: rs.length, effL1: effectiveReceipts, hosts: distinctHosts,
    medConf: +medianConfidence(rs).toFixed(2), l1r: +l1Ratio(rs).toFixed(2),
    evDiv: eventDiversity(rs), rec: +recency(rs).toFixed(2),
  }
})

const ranked = rows.filter(r => r.ranked).sort((a, b) => (b.score! - a.score!) || (b.receipts - a.receipts) || a.username.localeCompare(b.username))
const below = rows.filter(r => !r.ranked).sort((a, b) => (b.receipts - a.receipts) || a.username.localeCompare(b.username))

const hdr = 'score rank  recpt  effL1  hosts  medConf  l1r   evDiv  rec   username'
console.log(`\nRANKED (${ranked.length})`)
console.log(hdr)
ranked.forEach((r, i) => console.log(
  `${String(r.score).padStart(4)}  #${String(i + 1).padStart(2)}  ${String(r.receipts).padStart(4)}  ${String(r.effL1).padStart(4)}  ${String(r.hosts).padStart(4)}  ${r.medConf.toFixed(2).padStart(6)}  ${r.l1r.toFixed(2)}  ${String(r.evDiv).padStart(4)}  ${r.rec.toFixed(2)}  ${r.username}${r.verified ? ' ✓' : ''}`
))

console.log(`\nBELOW THRESHOLD (${below.length}) — "not yet ranked": ${below.map(b => b.username).join(', ')}`)

console.log('\nACCEPTANCE SPOT-CHECKS:')
for (const u of ['aniketaslaliya801', 'ryangrant144', 'olalekanridwanullah197']) {
  const r = rows.find(x => x.username === u)
  const rk = ranked.findIndex(x => x.username === u)
  const where = !r ? 'NOT FOUND' : r.ranked ? `ranked #${rk + 1} (score ${r.score})` : 'BELOW THRESHOLD'
  console.log(`  ${u}: ${where}` + (r ? `  [recpt ${r.receipts}, effL1 ${r.effL1}, hosts ${r.hosts}, medConf ${r.medConf}, l1r ${r.l1r}, evDiv ${r.evDiv}, rec ${r.rec}]` : ''))
}
console.log('')
