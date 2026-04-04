import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkAutoVerify } from '@/lib/autoVerify'

// Called after profile save to check if auto-verification criteria are now met
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, verified')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 })
  if (profile.verified) return NextResponse.json({ verified: true, already: true })

  const nowVerified = await checkAutoVerify(profile.id)
  return NextResponse.json({ verified: nowVerified })
}
