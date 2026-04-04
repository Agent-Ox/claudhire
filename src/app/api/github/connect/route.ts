import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL!))
  }

  const clientId = process.env.GITHUB_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/github/callback`
  const scope = 'read:user,repo'
  const state = Buffer.from(user.email!).toString('base64')

  const githubAuthUrl =
    `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`

  return NextResponse.redirect(githubAuthUrl)
}
