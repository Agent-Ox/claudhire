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

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url, verified, github_connected)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) console.error('Feed fetch error:', error)

  return <FeedClient initialPosts={posts || []} />
}
