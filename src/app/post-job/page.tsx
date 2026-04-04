import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PostJobForm from './PostJobForm'

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=/post-job')
  }

  const now = new Date().toISOString()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, product, expires_at')
    .eq('email', user.email)
    .eq('status', 'active')
    .in('product', ['job_post', 'full_access'])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()

  if (!sub) {
    redirect('/#pricing')
  }

  // Edit mode — read ?edit=jobId, fetch that job, pass as initialData
  const { edit: jobId } = await searchParams
  let initialData = undefined

  if (jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('employer_email', user.email) // only own jobs
      .maybeSingle()

    if (job) {
      initialData = {
        company_name: job.company_name || '',
        role_title: job.role_title || '',
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary_range || '',
        location: job.location || '',
        employment_type: job.employment_type || 'full-time',
        skills: job.skills || [],
      }
    }
  }

  return (
    <PostJobForm
      employerEmail={user.email!}
      jobId={jobId}
      initialData={initialData}
    />
  )
}
