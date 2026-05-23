import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateTeamEntity } from '@/lib/entities'

// POST — create a team entity for the authenticated user (Card 2 of /join router).
//
// Batch 4 D4=(a): minimal field scope — team_name (required) + optional
// 1-line description (currently stored only in returned response; persistent
// storage of the description is deferred to Batch 5+ when the full team
// profile schema lands).
//
// Result: entities row with kind='team', display_name=team_name,
// owner_user_id=auth user. Team has NO profile (Batch 5+ adds member graph).
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { team_name?: string; description?: string | null } = {}
  try { body = await req.json() } catch {}

  const teamName = (body.team_name || '').trim()
  if (!teamName) {
    return NextResponse.json({ error: 'team_name is required' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { entity, was_created } = await findOrCreateTeamEntity(admin, user, teamName)
    return NextResponse.json({
      entity_id: entity.id,
      external_id: entity.external_id,
      slug: entity.slug,
      display_name: entity.display_name,
      was_created,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Team creation failed' }, { status: 500 })
  }
}
