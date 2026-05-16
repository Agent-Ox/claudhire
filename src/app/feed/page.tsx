import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import FeedClient from './FeedClient'

export const metadata: Metadata = {
  title: 'Build Feed',
  description: 'What AI-native builders are shipping right now. Real projects, real outcomes, real proof of work.',
  alternates: { canonical: 'https://shipstacked.com/feed' },
  openGraph: {
    title: 'Build Feed — ShipStacked',
    description: 'What AI-native builders are shipping right now.',
    url: 'https://shipstacked.com/feed',
  },
}

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()

  const { data: posts } = await supabase
    .from('posts')
    // H9a: inner-join + filter on profiles.published — posts authored by the 3
    // neutralized fakes (jennypeterson224, johnchambers73, oxleethomasagentox598)
    // are excluded from the feed. Same precedent as Tier 0's /api/apply
    // status-filter hardening. No ItemList JSON-LD wrapper on this page per
    // Beacon 1's no-noise rule — only per-post Article markup at /feed/[id].
    .select('*, profiles!inner(username, full_name, avatar_url, verified, github_connected, published)')
    .eq('profiles.published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get current user's profile_id for delete ownership check
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserProfileId: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    currentUserProfileId = profile?.id
  }

  return <FeedClient initialPosts={posts || []} currentUserProfileId={currentUserProfileId} />
}
