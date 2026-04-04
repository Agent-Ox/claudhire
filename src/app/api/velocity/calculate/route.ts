import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Velocity Score formula:
// GitHub commits 90d:   max 40 points (1pt per commit, capped at 40)
// Build Feed posts 90d: max 30 points (10pt per post, capped at 30)
// Profile completeness: max 30 points
// Total: 0-100

function calcCompleteness(profile: any): number {
  let score = 0
  if (profile.avatar_url) score += 3
  if (profile.full_name) score += 2
  if (profile.role) score += 2
  if (profile.location) score += 1
  if (profile.bio) score += 3
  if (profile.about) score += 3
  if (profile.primary_profession) score += 2
  if (profile.seniority) score += 1
  if (profile.work_type) score += 1
  if (profile.day_rate) score += 2
  if (profile.timezone) score += 1
  if (profile.github_connected) score += 4
  if (profile.github_url || profile.x_url || profile.linkedin_url || profile.website_url) score += 2
  if (profile.languages && profile.languages.length > 0) score += 1
  if (profile.verified) score += 2
  const skillsBonus = (profile.skills?.length || 0) >= 3 ? 3 : 0
  const projectsBonus = Math.min((profile.projects?.length || 0) * 3, 9)
  return Math.min(score + skillsBonus + projectsBonus, 30)
}

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('*, skills(*), projects(*)')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 })

  // GitHub
  const { data: gh } = await admin
    .from('github_data')
    .select('commits_90d')
    .eq('profile_id', profile.id)
    .maybeSingle()

  const githubScore = Math.min(gh?.commits_90d || 0, 40)

  // Feed posts in last 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const { count: postCount } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .gte('created_at', cutoff.toISOString())

  const feedScore = Math.min((postCount || 0) * 10, 30)

  // Completeness
  const completenessScore = calcCompleteness(profile)

  const velocityScore = Math.min(githubScore + feedScore + completenessScore, 100)

  await admin
    .from('profiles')
    .update({ velocity_score: velocityScore })
    .eq('id', profile.id)

  return NextResponse.json({
    velocity_score: velocityScore,
    breakdown: { github: githubScore, feed: feedScore, completeness: completenessScore }
  })
}
