// Task 3a profile credibility audit (read-only). Dumps what the top-6 /u pages
// would render so concrete data issues (empty fields, dead/L0 receipts, shared-doc
// hosts, skill dumps, suspicious links) surface without a browser.
//
//   node --env-file=.env.local --experimental-strip-types scripts/v2/audit-profiles.ts

import { createClient } from '@supabase/supabase-js'
import { SHARED_DOC_HOST_RE, extractHost } from '../../src/lib/ranking/quality-score.ts'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TOP6 = ['ryangrant144', 'aniketaslaliya801', 'janwinum9', 'sumitdongardive9', 'sunnyzheng606', 'joedias995']

const flag = (v: any) => (v === null || v === undefined || v === '' ? '⚠️ EMPTY' : JSON.stringify(v).slice(0, 70))

for (const username of TOP6) {
  const { data: p } = await admin.from('profiles').select('*').eq('username', username).maybeSingle()
  if (!p) { console.log(`\n#### ${username} — NOT FOUND`); continue }

  const [{ data: projects }, { data: posts }, { data: skills }, { data: gh }, { data: receipts }] = await Promise.all([
    admin.from('projects').select('title, project_url, outcome, description').eq('profile_id', p.id).order('display_order'),
    admin.from('posts').select('title, outcome, url').eq('profile_id', p.id),
    admin.from('skills').select('name, category').eq('profile_id', p.id),
    admin.from('github_data').select('github_username, repos_count, commits_90d').eq('profile_id', p.id).maybeSingle(),
    p.entity_id ? admin.from('proof_receipts').select('title, verification_level, event_type, artifacts').eq('subject_id', p.entity_id).eq('visibility', 'public').order('issued_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
  ])

  const skillsByCat: Record<string, number> = {}
  for (const s of (skills ?? [])) skillsByCat[s.category || '(none)'] = (skillsByCat[s.category || '(none)'] ?? 0) + 1

  console.log(`\n#################### ${username} ####################`)
  console.log(`full_name: ${flag(p.full_name)}`)
  console.log(`role: ${flag(p.role)}   |  primary_profession: ${flag(p.primary_profession)}`)
  console.log(`location: ${flag(p.location)}   |  availability: ${flag(p.availability)}`)
  console.log(`bio: ${flag(p.bio)}`)
  console.log(`about: ${p.about ? p.about.length + ' chars' : '⚠️ EMPTY'}`)
  console.log(`avatar_url: ${p.avatar_url ? 'yes' : '⚠️ none (initials fallback)'}`)
  console.log(`verified: ${p.verified}  |  velocity_score: ${p.velocity_score}  |  entity_id: ${p.entity_id ?? '⚠️ NULL (no receipts)'}`)
  console.log(`seniority:${flag(p.seniority)} work_type:${flag(p.work_type)} day_rate:${flag(p.day_rate)} timezone:${flag(p.timezone)} languages:${flag(p.languages)}`)
  console.log(`github_connected: ${p.github_connected} | github_data: ${gh ? `@${gh.github_username} repos=${gh.repos_count} commits90d=${gh.commits_90d}` : 'none'}`)
  console.log(`LINKS: github=${p.github_url || '-'} | x=${p.x_url || '-'} | linkedin=${p.linkedin_url || '-'} | website=${p.website_url || '-'}`)
  console.log(`skills total=${(skills ?? []).length} byCat=${JSON.stringify(skillsByCat)}`)

  console.log(`projects (${(projects ?? []).length}):`)
  for (const pr of (projects ?? [])) {
    const host = pr.project_url ? extractHost(pr.project_url) : null
    console.log(`   • ${flag(pr.title)} | url:${host || '-'}${host && SHARED_DOC_HOST_RE.test(host) ? ' ⚠️SHARED-DOC' : ''} | outcome:${pr.outcome ? 'y' : '-'}`)
  }
  console.log(`posts (${(posts ?? []).length}): ${(posts ?? []).map((x: any) => x.title?.slice(0, 30)).join(' | ') || '-'}`)
  console.log(`receipts (${(receipts ?? []).length}):`)
  for (const r of (receipts ?? []) as any[]) {
    const url = r.artifacts?.[0]?.url
    const host = url ? extractHost(url) : null
    const dead = r.verification_level === 'L0_claimed'
    const shared = host && SHARED_DOC_HOST_RE.test(host)
    console.log(`   • ${(r.title || '(no title)').slice(0, 40).padEnd(40)} ${r.verification_level === 'L1_artifact_confirmed' ? 'L1' : 'L0'}${dead ? ' ⚠️DEAD-LINK' : ''} ${(r.event_type || '').padEnd(14)} ${host || ''}${shared ? ' ⚠️SHARED-DOC' : ''}`)
  }
}
console.log('')
