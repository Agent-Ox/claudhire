import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import JobDetailClient from './JobDetailClient'

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

  // JobPosting JSON-LD for Google Jobs
  const employmentTypeMap: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    'contract': 'CONTRACTOR',
    'freelance': 'CONTRACTOR',
  }
  const jobLd: any = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.role_title,
    description: `<p>${(job.description || '').replace(/\n/g, '</p><p>')}</p>${job.requirements ? `<h3>Requirements</h3><p>${job.requirements.replace(/\n/g, '</p><p>')}</p>` : ''}`,
    datePosted: job.created_at,
    validThrough: job.expires_at,
    employmentType: employmentTypeMap[job.employment_type] || 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.anonymous ? 'A ShipStacked employer' : (job.company_name || 'ShipStacked employer'),
      sameAs: companySlug ? `https://shipstacked.com/company/${companySlug}` : 'https://shipstacked.com',
    },
    directApply: false,
    url: `https://shipstacked.com/jobs/${id}`,
  }
  // Location handling — Remote vs On-site
  if (job.location === 'Remote') {
    jobLd.jobLocationType = 'TELECOMMUTE'
    jobLd.applicantLocationRequirements = { '@type': 'Country', name: 'Worldwide' }
  } else if (job.location) {
    jobLd.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } }
  }
  // Salary handling
  if (job.day_rate) {
    jobLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', value: job.day_rate, unitText: 'DAY' },
    }
  } else if (job.salary_range) {
    jobLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', value: job.salary_range, unitText: 'YEAR' },
    }
  }

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
