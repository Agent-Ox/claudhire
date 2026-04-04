import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

async function fetchGitHubData(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Fetch user profile
  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw new Error('Failed to fetch GitHub user')
  const user = await userRes.json()

  // Fetch repos (up to 100, sorted by updated)
  const reposRes = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&type=owner',
    { headers }
  )
  const repos = reposRes.ok ? await reposRes.json() : []

  // Count public repos
  const reposCount = user.public_repos || 0

  // Extract top languages from repos
  const langCounts: Record<string, number> = {}
  for (const repo of repos) {
    if (repo.language) {
      langCounts[repo.language] = (langCounts[repo.language] || 0) + 1
    }
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)

  // Fetch commit activity — contributions in last 90 days
  // Use the events API as a proxy (public events, last 300)
  const eventsRes = await fetch(
    `https://api.github.com/users/${user.login}/events?per_page=100`,
    { headers }
  )
  let commits90d = 0
  if (eventsRes.ok) {
    const events = await eventsRes.json()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    for (const event of events) {
      if (
        event.type === 'PushEvent' &&
        new Date(event.created_at) > cutoff
      ) {
        commits90d += event.payload?.commits?.length || 0
      }
    }
  }

  // Build contribution data for display (last 12 weeks of push events)
  const contributionData: Record<string, number> = {}
  if (eventsRes.ok) {
    const events = await eventsRes.json()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 84) // 12 weeks
    for (const event of events) {
      if (event.type === 'PushEvent' && new Date(event.created_at) > cutoff) {
        const week = new Date(event.created_at).toISOString().slice(0, 10)
        contributionData[week] = (contributionData[week] || 0) + (event.payload?.commits?.length || 0)
      }
    }
  }

  return {
    github_username: user.login,
    avatar_url: user.avatar_url,
    repos_count: reposCount,
    commits_90d: commits90d,
    top_languages: topLanguages,
    contribution_data: contributionData,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Decode email from state
  let email: string
  try {
    email = Buffer.from(state, 'base64').toString('utf-8')
  } catch {
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: `${siteUrl}/api/github/callback`,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  const accessToken = tokenData.access_token

  // Fetch GitHub data
  let githubData
  try {
    githubData = await fetchGitHubData(accessToken)
  } catch {
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Save to Supabase using service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get profile by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.redirect(`${siteUrl}/dashboard?github=error`)
  }

  // Upsert github_data
  await supabase.from('github_data').upsert({
    profile_id: profile.id,
    github_username: githubData.github_username,
    repos_count: githubData.repos_count,
    commits_90d: githubData.commits_90d,
    top_languages: githubData.top_languages,
    contribution_data: githubData.contribution_data,
    last_synced: new Date().toISOString(),
  }, { onConflict: 'profile_id' })

  // Update profile: mark github connected, save username
  // Also update avatar from GitHub if they don't have one yet
  const profileUpdate: Record<string, unknown> = {
    github_connected: true,
    github_username: githubData.github_username,
    github_url: `https://github.com/${githubData.github_username}`,
  }
  if (!profile.avatar_url && githubData.avatar_url) {
    profileUpdate.avatar_url = githubData.avatar_url
  }

  await supabase.from('profiles').update(profileUpdate).eq('id', profile.id)

  return NextResponse.redirect(`${siteUrl}/dashboard?github=connected`)
}
