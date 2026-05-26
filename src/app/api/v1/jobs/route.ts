import { rateLimit } from '@/lib/rateLimit'
import { authenticateApiKey, apiError, apiOk, requireScope } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { postJobToX } from '@/lib/xPost'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/v1/jobs — post a job (buyer:rw). Mirrors the dashboard /api/jobs insert,
// keyed on the API key's email. Auto-distributes to X (fire-and-forget) like the
// dashboard path.
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req)
  if (!auth.ok) return apiError(auth.status, auth.error)
  const rl = await rateLimit(auth.auth.keyId)
  if (!rl.success) return apiError(429, 'Rate limit exceeded. Max 60 requests per minute.')
  const scopeErr = requireScope(auth.auth, ['buyer:rw'])
  if (scopeErr) return scopeErr

  const email = auth.auth.email
  if (!email) return apiError(400, 'API key has no associated email')

  let body: any
  try { body = await req.json() } catch { return apiError(400, 'Invalid JSON body') }
  const {
    role_title, company_name, description, requirements,
    salary_range, day_rate, location, employment_type,
    job_type, skills, timezone, urgency, hiring_for, anonymous,
  } = body
  if (!role_title?.trim()) return apiError(400, 'role_title required')

  const db = admin()
  const { data: job, error } = await db
    .from('jobs')
    .insert({
      employer_email: email,
      role_title: role_title.trim(),
      company_name: company_name?.trim() || '',
      description: description?.trim() || '',
      requirements: requirements?.trim() || '',
      salary_range: salary_range?.trim() || '',
      day_rate: day_rate?.trim() || '',
      location: location || 'Remote',
      employment_type: employment_type || 'contract',
      job_type: job_type || 'contract',
      skills: skills || [],
      timezone: timezone || 'Any',
      urgency: urgency || 'Actively hiring',
      hiring_for: hiring_for || '',
      anonymous: anonymous || false,
      status: 'active',
    })
    .select()
    .single()
  if (error) return apiError(500, 'Failed to create job', error.message)

  // Fire-and-forget X distribution (same as the dashboard job-post path).
  postJobToX({
    id: job.id,
    role_title: job.role_title,
    company_name: anonymous ? 'A ShipStacked hirer' : job.company_name,
    location: job.location,
    day_rate: job.day_rate,
    salary_range: job.salary_range,
    job_type: job.job_type,
  }).then(result => {
    if (result.success) console.log('X post successful:', result.id)
    else console.error('X post failed:', result.error)
  }).catch(() => {})

  return apiOk({ job })
}
