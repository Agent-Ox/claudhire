import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import JobsClient from './JobsClient'

export const metadata: Metadata = {
  title: 'AI-Native Jobs',
  description: 'Browse open roles at companies hiring AI-native builders, prompt engineers, and AI automation specialists. Verified talent. Direct applications.',
  alternates: { canonical: 'https://shipstacked.com/jobs' },
  openGraph: {
    title: 'AI-Native Jobs — ShipStacked',
    description: 'Browse open roles at companies hiring AI-native builders, prompt engineers, and AI automation specialists.',
    url: 'https://shipstacked.com/jobs',
  },
}

export default async function JobsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = (user?.user_metadata?.role as 'builder' | 'employer' | 'admin' | null) ?? null

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Active jobs
  const { data: jobs } = await admin
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  // Bulk fetch employer logos
  const jobList = jobs || []
  const employerEmails = [...new Set(jobList.map((j: any) => j.employer_email))]
  const { data: empProfiles } = employerEmails.length > 0
    ? await admin.from('employer_profiles').select('email, logo_url, slug').in('email', employerEmails)
    : { data: [] }
  const empMap = Object.fromEntries((empProfiles || []).map((e: any) => [e.email, e]))
  const jobsWithLogos = jobList.map((j: any) => ({ ...j, employer_profile: empMap[j.employer_email] || null }))

  // Builder: which jobs have they already applied to?
  let appliedJobIds: string[] = []
  if (role === 'builder' && user) {
    const { data: applications } = await admin
      .from('applications')
      .select('job_id')
      .eq('builder_email', user.email)
    appliedJobIds = applications?.map((a: any) => a.job_id) || []
  }

  return (
    <JobsClient
      jobs={jobsWithLogos}
      role={role}
      appliedJobIds={appliedJobIds}
    />
  )
}
