import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get existing github_data to find the stored username
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, github_username')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile?.github_username) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  // Re-initiate OAuth to get a fresh token — redirect to connect
  // For now, return the connect URL so the client can redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'
  return NextResponse.json({ reconnect_url: `${siteUrl}/api/github/connect` })
}
