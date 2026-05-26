import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { getRankedBuilders } from '@/lib/ranking/get-ranked-builders'
import { bucketsForEvents } from '@/lib/ranking/facets'
import { extractHost, isSharedDocHost } from '@/lib/ranking/quality-score'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/talent/search — Formula E ranked builders, filterable (buyer:rw).
// Wraps getRankedBuilders() (single ranking source of truth — NOT reimplemented).
// Ranked-only: below-threshold builders are deliberately excluded (Phase 3 decision).
// Two batched secondary queries add per-builder Atlas roles + proof-of-work aggregates
// without touching the public-safe RankedBuilder shape.
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const url = new URL(req.url)
  const cluster = url.searchParams.get('cluster')?.trim() || null
  const rolesParam = url.searchParams.get('role')?.trim() || null
  const shipped = url.searchParams.get('shipped')?.trim() || null
  const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10)
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0
  const roles = rolesParam ? rolesParam.split(',').map(s => s.trim()).filter(Boolean) : null

  // Ranked-only (decision 2). No limit arg → all ranked builders, filtered + paginated here.
  const { ranked } = await getRankedBuilders()

  const db = admin()

  // Secondary query 1: profile.id -> entity_id for the ranked set (entity_id is NOT
  // on the public-safe RankedBuilder shape, so we resolve it here).
  const profileIds = ranked.map(b => b.id)
  const entityByProfile = new Map<string, number>()
  if (profileIds.length > 0) {
    const { data: profRows } = await db.from('profiles').select('id, entity_id').in('id', profileIds)
    for (const r of (profRows ?? [])) if (r.entity_id != null) entityByProfile.set(r.id, r.entity_id)
  }
  const entityIds = [...new Set([...entityByProfile.values()])]

  // Secondary query 2: receipts for all ranked entities -> roles (confirmed+inferred)
  // + PoW aggregates (l1 count, distinct non-shared-doc hosts, last shipped). Keys are
  // String(subject_id) to avoid bigint/number drift (same approach as getRankedBuilders).
  const rolesByEntity = new Map<string, { confirmed: Set<string>; inferred: Set<string> }>()
  const powByEntity = new Map<string, { l1: number; hosts: Set<string>; last: string | null }>()
  if (entityIds.length > 0) {
    const { data: receipts } = await db
      .from('proof_receipts')
      .select('subject_id, atlas_confirmed, atlas_inferred, verification_level, artifacts, issued_at')
      .in('subject_id', entityIds)
      .eq('visibility', 'public')
    for (const r of (receipts ?? []) as any[]) {
      const ek = String(r.subject_id)
      let rr = rolesByEntity.get(ek)
      if (!rr) { rr = { confirmed: new Set(), inferred: new Set() }; rolesByEntity.set(ek, rr) }
      for (const c of (Array.isArray(r.atlas_confirmed) ? r.atlas_confirmed : [])) rr.confirmed.add(c)
      for (const i of (Array.isArray(r.atlas_inferred) ? r.atlas_inferred : [])) rr.inferred.add(i)
      let pw = powByEntity.get(ek)
      if (!pw) { pw = { l1: 0, hosts: new Set(), last: null }; powByEntity.set(ek, pw) }
      if (r.verification_level === 'L1_artifact_confirmed') {
        pw.l1++
        const arts = Array.isArray(r.artifacts) ? (r.artifacts as Array<{ url?: string | null }>) : []
        const host = extractHost(arts[0]?.url)
        if (host && !isSharedDocHost(host)) pw.hosts.add(host)
      }
      if (r.issued_at && (!pw.last || r.issued_at > pw.last)) pw.last = r.issued_at
    }
  }

  const rolesFor = (b: { id: string }) => {
    const eid = entityByProfile.get(b.id)
    const rr = eid != null ? rolesByEntity.get(String(eid)) : undefined
    const confirmed = rr ? [...rr.confirmed] : []
    const inferred = rr ? [...rr.inferred].filter(x => !rr.confirmed.has(x)) : []
    return { confirmed, inferred }
  }

  // Filters mirror /talent's facets.ts behavior: cluster via atlasClusters, shipped via
  // bucketsForEvents, role via the confirmed+inferred set from the secondary query.
  let filtered = ranked
  if (cluster) filtered = filtered.filter(b => b.atlasClusters.includes(cluster))
  if (shipped) filtered = filtered.filter(b => bucketsForEvents(b.eventTypes).includes(shipped))
  if (roles && roles.length > 0) {
    filtered = filtered.filter(b => {
      const { confirmed, inferred } = rolesFor(b)
      const all = [...confirmed, ...inferred]
      return roles.some(r => all.includes(r))
    })
  }

  const total = filtered.length
  const page = filtered.slice(offset, offset + limit)

  return apiOk({
    results: page.map(b => {
      const eid = entityByProfile.get(b.id)
      const pw = eid != null ? powByEntity.get(String(eid)) : undefined
      const { confirmed, inferred } = rolesFor(b)
      return {
        username: b.username,
        full_name: b.full_name,
        role: b.role,
        location: b.location,
        atlas_clusters: b.atlasClusters,
        atlas_roles_confirmed: confirmed,
        atlas_roles_inferred: inferred,
        proof_of_work: {
          l1_receipts: pw?.l1 ?? 0,
          distinct_hosts: pw?.hosts.size ?? 0,
          last_shipped: pw?.last ?? null,
        },
        quality_score: b.quality_score,
        verified: b.verified,
        profile_url: `https://shipstacked.com/u/${b.username}`,
      }
    }),
    total,
    limit,
    offset,
  })
}
