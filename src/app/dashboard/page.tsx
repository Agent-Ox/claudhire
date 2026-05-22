import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BuilderDashboardClient from './BuilderDashboardClient'
import AgentOnboarding from './AgentOnboarding'
import { listActiveCollections } from '@/lib/collections/collections'
import { listMembershipsForProfile } from '@/lib/collections/consent'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const agentMode = params.agent === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, projects(*), skills(*)')
    .eq('email', user.email)
    .maybeSingle()

  // Agent mode: show onboarding screen regardless of profile state
  // No profile + not agent mode: redirect to join
  if (agentMode || !profile) {
    return <AgentOnboarding />
  }

  // Normal dashboard
  const { data: applications } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('builder_email', user.email)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: hirers } = await supabase
    .from('employer_profiles')
    .select('*')
    .eq('public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: githubData } = await supabase
    .from('github_data')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle()

  const { count: provenPostCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .not('outcome', 'is', null)
    .neq('outcome', '')
    .not('url', 'is', null)
    .neq('url', '')

  // Consented collections — per-collection cards rendered in a loop on the
  // dashboard, gated on profile.published in the client component. Zero
  // active collections → empty arrays → no cards → dashboard byte-identical
  // to today. Both queries use the session-bound client; RLS allows the
  // public-read-active policy on collections, and memberships are
  // service-role-only — but the user's own profile_id-keyed memberships
  // can be read via the same path because we use service role for that
  // specific lookup via the helper.
  const activeCollections = await listActiveCollections(supabase)
  const memberships = await listMembershipsForProfile(supabase, profile.id)

  return (
    <BuilderDashboardClient
      profile={profile}
      applications={applications || []}
      hirers={hirers || []}
      email={user.email!}
      githubData={githubData || null}
      velocityScore={profile?.velocity_score || 0}
      provenPostCount={provenPostCount || 0}
      activeCollections={activeCollections}
      memberships={memberships}
    />
  )
}
