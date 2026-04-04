import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BuilderDashboardClient from './BuilderDashboardClient'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*), skills(*)')
    .eq('email', user.email)
    .maybeSingle()

  const { data: applications } = profile ? await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('builder_email', user.email)
    .order('created_at', { ascending: false })
    .limit(5) : { data: [] }

  const { data: employers } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: githubData } = profile ? await supabase
    .from('github_data')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle() : { data: null }

  // Count Build Feed posts with outcome + url (for auto-verify progress)
  const { count: provenPostCount } = profile ? await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '') : { count: 0 }

  return (
    <BuilderDashboardClient
      profile={profile}
      applications={applications || []}
      employers={employers || []}
      email={user.email!}
      githubData={githubData || null}
      velocityScore={profile?.velocity_score || 0}
      provenPostCount={provenPostCount || 0}
    />
  )
}
