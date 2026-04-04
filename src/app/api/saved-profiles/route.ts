import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch all saved profile IDs for current employer
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await admin()
    .from('saved_profiles')
    .select('profile_id, created_at')
    .eq('employer_email', user.email)
    .order('created_at', { ascending: false })

  return NextResponse.json({ saved: data || [] })
}

// POST — save a profile
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { profile_id } = await req.json()
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  const { error } = await admin()
    .from('saved_profiles')
    .insert({ employer_email: user.email, profile_id })

  if (error && error.code !== '23505') { // 23505 = unique violation, already saved
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ saved: true })
}

// DELETE — unsave a profile
export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { profile_id } = await req.json()
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  await admin()
    .from('saved_profiles')
    .delete()
    .eq('employer_email', user.email)
    .eq('profile_id', profile_id)

  return NextResponse.json({ saved: false })
}
