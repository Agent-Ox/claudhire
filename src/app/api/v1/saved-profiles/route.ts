import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/saved-profiles — buyer's shortlist (buyer:rw). Wraps the existing
// saved_profiles table (employer_email, profile_id, created_at). Two-step fetch
// (saves → profiles) rather than a PostgREST embed, to avoid relying on a FK the
// existing table may or may not declare.
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const email = auth.auth.email
  if (!email) return apiError(400, 'API key has no associated email')

  const db = admin()
  const { data: saves } = await db
    .from('saved_profiles')
    .select('profile_id, created_at')
    .eq('employer_email', email)
    .order('created_at', { ascending: false })

  const ids = (saves ?? []).map((s: any) => s.profile_id)
  const profById: Record<string, any> = {}
  if (ids.length > 0) {
    const { data: profs } = await db
      .from('profiles')
      .select('id, username, full_name, role, location, verified, avatar_url, published')
      .in('id', ids)
      .eq('published', true)
    for (const p of (profs ?? [])) profById[p.id] = p
  }

  return apiOk({
    saved: (saves ?? [])
      .filter((s: any) => profById[s.profile_id]) // drop unpublished/missing builders
      .map((s: any) => {
        const p = profById[s.profile_id]
        return {
          profile_id: s.profile_id,
          created_at: s.created_at,
          builder: {
            username: p.username,
            full_name: p.full_name,
            role: p.role,
            location: p.location,
            verified: p.verified,
            avatar_url: p.avatar_url,
            profile_url: `https://shipstacked.com/u/${p.username}`,
          },
        }
      }),
  })
}

// POST /api/v1/saved-profiles — { builder_username, action: 'save' | 'unsave' } (buyer:rw).
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const email = auth.auth.email
  if (!email) return apiError(400, 'API key has no associated email')

  let body: { builder_username?: string; action?: string }
  try { body = await req.json() } catch { return apiError(400, 'Invalid JSON body') }
  const username = body.builder_username?.trim()
  const action = body.action?.trim() || 'save'
  if (!username) return apiError(400, 'builder_username required')
  if (action !== 'save' && action !== 'unsave') return apiError(400, "action must be 'save' or 'unsave'")

  const db = admin()
  const { data: builder } = await db
    .from('profiles')
    .select('id')
    .eq('username', username)
    .eq('published', true)
    .maybeSingle()
  if (!builder) return apiError(404, 'Builder not found or not published')

  if (action === 'save') {
    const { error } = await db.from('saved_profiles').insert({ employer_email: email, profile_id: builder.id })
    if (error && error.code !== '23505') return apiError(500, 'Failed to save profile', error.message) // 23505 = already saved
    return apiOk({ saved: true, profile_id: builder.id })
  }

  await db.from('saved_profiles').delete().eq('employer_email', email).eq('profile_id', builder.id)
  return apiOk({ saved: false, profile_id: builder.id })
}
