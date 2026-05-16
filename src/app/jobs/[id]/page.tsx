import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import JobDetailClient from './JobDetailClient'
import { buildJobPostingJsonLd } from '@/lib/jsonld/job-posting'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: job } = await admin.from('jobs').select('role_title, company_name, description, anonymous').eq('id', id).maybeSingle()
  if (!job) return { title: 'Job not found' }
  const company = job.anonymous ? 'a company' : job.company_name
  return {
    title: `${job.role_title} at ${company} — ShipStacked`,
    description: job.description?.slice(0, 160) || `${job.role_title} — apply on ShipStacked`,
    openGraph: {
      title: `${job.role_title} at ${company}`,
      description: job.description?.slice(0, 160) || '',
      url: `https://shipstacked.com/jobs/${id}`,
      images: [{
        url: `https://shipstacked.com/og?type=job&v=2&name=${encodeURIComponent(job.role_title)}&location=${encodeURIComponent(job.anonymous ? '' : (job.company_name || ''))}`,
        width: 1200,
        height: 630,
        alt: `${job.role_title} at ${company} — ShipStacked`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${job.role_title} at ${company}`,
      description: job.description?.slice(0, 160) || '',
      images: [`https://shipstacked.com/og?type=job&v=2&name=${encodeURIComponent(job.role_title)}&location=${encodeURIComponent(job.anonymous ? '' : (job.company_name || ''))}`],
    },
    alternates: { canonical: `https://shipstacked.com/jobs/${id}` },
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: job } = await admin
    .from('jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!job) notFound()
  if (job.status !== 'active') permanentRedirect('/jobs')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = (user?.user_metadata?.role as 'builder' | 'employer' | 'admin' | null) ?? null

  // Is this job still active?
  const isExpired = !job.expires_at || new Date(job.expires_at) < new Date()
  const isActive = job.status === 'active' && !isExpired

  // Has this builder already applied?
  let alreadyApplied = false
  if (role === 'builder' && user) {
    const { data: existing } = await admin
      .from('applications')
      .select('id')
      .eq('job_id', id)
      .eq('builder_email', user.email)
      .maybeSingle()
    alreadyApplied = !!existing
  }

  // Employer profile for company link
  let companySlug: string | null = null
  if (!job.anonymous) {
    const { data: ep } = await admin
      .from('employer_profiles')
      .select('slug')
      .eq('email', job.employer_email)
      .eq('public', true)
      .maybeSingle()
    companySlug = ep?.slug || null
  }

  // Beacon 1 — JobPosting JSON-LD with shipstacked: namespace. This code
  // path only runs for status='active' jobs (the redirect above gates it),
  // so the emit is dormant today (0 active jobs post-Tier-0).
  const jobLd = buildJobPostingJsonLd(
    {
      id: job.id,
      role_title: job.role_title,
      description: job.description,
      requirements: job.requirements,
      created_at: job.created_at,
      expires_at: job.expires_at,
      employment_type: job.employment_type,
      company_name: job.company_name,
      anonymous: job.anonymous,
      location: job.location,
      day_rate: job.day_rate,
      salary_range: job.salary_range,
      employer_email: job.employer_email,
    },
    { slug: companySlug, public: !!companySlug },
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }} />
    <JobDetailClient
      job={job}
      role={role}
      isActive={isActive}
      alreadyApplied={alreadyApplied}
      companySlug={companySlug}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'}
    />
    </>
  )
}
