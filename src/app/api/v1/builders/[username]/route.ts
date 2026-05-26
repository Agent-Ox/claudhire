import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/v1/builders/<username> — deep-fetch a public builder profile + receipts
// + atlas roles. Any authenticated scope may read a published profile; 404 otherwise.
export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)

  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')

  const scopeErr = requireScope(auth.auth, ['buyer:rw', 'builder:rw', 'agent:rw'])
  if (scopeErr) return scopeErr

  const { username } = await ctx.params
  const db = admin()

  const { data: profile } = await db
    .from('profiles')
    .select('id, username, full_name, role, bio, about, location, github_url, x_url, linkedin_url, website_url, verified, primary_profession, seniority, work_type, day_rate, timezone, languages, entity_id, published, avatar_url')
    .eq('username', username)
    .eq('published', true)
    .maybeSingle()
  if (!profile) return apiError(404, 'Builder not found or not published')

  // Real tables are `skills` and `projects` (NOT profile_skills/profile_projects).
  const [{ data: skills }, { data: projects }] = await Promise.all([
    db.from('skills').select('category, name').eq('profile_id', profile.id),
    db.from('projects').select('title, description, outcome, project_url, display_order').eq('profile_id', profile.id).order('display_order'),
  ])

  let receipts: any[] = []
  if (profile.entity_id) {
    const { data } = await db
      .from('proof_receipts')
      .select('slug, title, description, event_type, atlas_confirmed, atlas_inferred, verification_level, issued_at')
      .eq('subject_id', profile.entity_id)
      .eq('visibility', 'public')
      .order('issued_at', { ascending: false })
      .limit(50)
    receipts = data ?? []
  }

  return apiOk({
    builder: {
      username: profile.username,
      full_name: profile.full_name,
      role: profile.role,
      bio: profile.bio,
      about: profile.about,
      location: profile.location,
      github_url: profile.github_url,
      x_url: profile.x_url,
      linkedin_url: profile.linkedin_url,
      website_url: profile.website_url,
      verified: profile.verified,
      primary_profession: profile.primary_profession,
      seniority: profile.seniority,
      work_type: profile.work_type,
      day_rate: profile.day_rate,
      timezone: profile.timezone,
      languages: profile.languages,
      avatar_url: profile.avatar_url,
      profile_url: `https://shipstacked.com/u/${profile.username}`,
      skills: (skills ?? []).map((s: any) => ({ category: s.category, name: s.name })),
      projects: (projects ?? []).map((p: any) => ({
        title: p.title,
        description: p.description,
        outcome: p.outcome,
        url: p.project_url,
      })),
      recent_receipts: receipts,
    },
  })
}
