/**
 * JobPosting markup for /jobs/[id].
 *
 * Reconciles the existing inline JobPosting at src/app/jobs/[id]/page.tsx
 * to the V2 dual-context. The page itself 308-redirects when status !==
 * 'active' (Tier 0 work) so this builder only ever runs for active jobs.
 * Currently 0 active jobs in prod → emitter is dormant. Lights up
 * automatically when a real status='active' job lands.
 *
 * Spec: BEACON_1_DISCOVERY.md §H5, §D
 */

import { CANONICAL_HOST, SCHEMA_CONTEXT, employerOrgId, jobPostingId, orgId } from './context.ts'

export interface JobPostingInput {
  id: string
  role_title: string
  description: string | null
  requirements: string | null
  created_at: string
  expires_at: string | null
  employment_type: string | null
  company_name: string | null
  anonymous: boolean | null
  location: string | null
  day_rate: string | null
  salary_range: string | null
  employer_email: string
}

export interface JobPostingEmployerInput {
  slug: string | null
  public: boolean
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  'full-time': 'FULL_TIME',
  'part-time': 'PART_TIME',
  contract: 'CONTRACTOR',
  freelance: 'CONTRACTOR',
}

export interface JobPostingJsonLd {
  '@context': typeof SCHEMA_CONTEXT
  '@type': ['JobPosting', 'shipstacked:JobPosting']
  '@id': string
  title: string
  description: string
  datePosted: string
  validThrough?: string
  employmentType: string
  hiringOrganization: { '@id': string; '@type': 'Organization'; name: string; sameAs?: string }
  directApply: false
  url: string
  jobLocationType?: 'TELECOMMUTE'
  applicantLocationRequirements?: { '@type': 'Country'; name: string }
  jobLocation?: { '@type': 'Place'; address: { '@type': 'PostalAddress'; addressLocality: string } }
  baseSalary?: {
    '@type': 'MonetaryAmount'
    currency: string
    value: { '@type': 'QuantitativeValue'; value: string; unitText: 'DAY' | 'YEAR' }
  }
}

function buildHtmlDescription(job: JobPostingInput): string {
  const desc = (job.description || '').replace(/\n/g, '</p><p>')
  let html = `<p>${desc}</p>`
  if (job.requirements) {
    const req = job.requirements.replace(/\n/g, '</p><p>')
    html += `<h3>Requirements</h3><p>${req}</p>`
  }
  return html
}

export function buildJobPostingJsonLd(
  job: JobPostingInput,
  employer: JobPostingEmployerInput | null,
): JobPostingJsonLd {
  const url = jobPostingId(job.id)
  const employerName = job.anonymous
    ? 'A ShipStacked employer'
    : (job.company_name || 'ShipStacked employer')

  // Reference employer @id only if the employer profile is public (so the
  // resolved URL would 200). Otherwise reference site-level Organization
  // so the hiringOrganization remains a resolvable @id.
  const employerIdRef =
    !job.anonymous && employer?.slug && employer.public
      ? employerOrgId(employer.slug)
      : orgId()
  const employerSameAs =
    !job.anonymous && employer?.slug && employer.public
      ? `${CANONICAL_HOST}/company/${employer.slug}`
      : undefined

  const hiringOrg: JobPostingJsonLd['hiringOrganization'] = {
    '@id': employerIdRef,
    '@type': 'Organization',
    name: employerName,
  }
  if (employerSameAs) hiringOrg.sameAs = employerSameAs

  const out: JobPostingJsonLd = {
    '@context': SCHEMA_CONTEXT,
    '@type': ['JobPosting', 'shipstacked:JobPosting'],
    '@id': url,
    title: job.role_title,
    description: buildHtmlDescription(job),
    datePosted: job.created_at,
    employmentType: EMPLOYMENT_TYPE_MAP[job.employment_type || ''] || 'FULL_TIME',
    hiringOrganization: hiringOrg,
    directApply: false,
    url,
  }

  if (job.expires_at) out.validThrough = job.expires_at

  if (job.location === 'Remote') {
    out.jobLocationType = 'TELECOMMUTE'
    out.applicantLocationRequirements = { '@type': 'Country', name: 'Worldwide' }
  } else if (job.location && job.location.trim().length > 0) {
    out.jobLocation = {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    }
  }

  if (job.day_rate && job.day_rate.trim().length > 0) {
    out.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', value: job.day_rate, unitText: 'DAY' },
    }
  } else if (job.salary_range && job.salary_range.trim().length > 0) {
    out.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', value: job.salary_range, unitText: 'YEAR' },
    }
  }

  return out
}
