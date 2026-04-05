'use client'

import { useState } from 'react'
import Link from 'next/link'

function ApplyButton({ job, alreadyApplied }: { job: any; alreadyApplied: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(alreadyApplied ? 'done' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleApply() {
    setState('loading')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) { setState('done'); return }
        setErrorMsg(data.error || 'Something went wrong')
        setState('error')
        return
      }
      setState('done')
    } catch {
      setErrorMsg('Something went wrong')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a7f37', background: '#e3f3e3', padding: '0.5rem 1.25rem', borderRadius: 980 }}>
        Applied ✓
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span style={{ fontSize: 12, color: '#c0392b' }}>{errorMsg}</span>
    )
  }

  return (
    <button
      onClick={handleApply}
      disabled={state === 'loading'}
      style={{
        padding: '0.5rem 1.25rem', background: state === 'loading' ? '#6e6e73' : '#0071e3',
        color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500,
        border: 'none', cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {state === 'loading' ? 'Applying...' : 'Apply →'}
    </button>
  )
}

export default function JobsClient({
  jobs,
  role,
  appliedJobIds,
}: {
  jobs: any[]
  role: 'builder' | 'employer' | 'admin' | null
  appliedJobIds: string[]
}) {
  const isBuilder = role === 'builder'
  const isEmployer = role === 'employer' || role === 'admin'
  const isLoggedOut = role === null

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 1.5rem 3rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0071e3', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Jobs</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem' }}>AI-native roles</h1>
          <p style={{ fontSize: 15, color: '#6e6e73' }}>Companies hiring AI-native builders.</p>
        </div>

        {jobs.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: '1rem' }}>🔍</p>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>No jobs posted yet.</h2>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>Be the first company to hire AI-native talent.</p>
            {isEmployer && (
              <Link href="/post-job" style={{ padding: '0.75rem 1.5rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                Post a job →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {jobs.map((job: any) => (
              <div key={job.id} style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', margin: 0 }}>{job.role_title}</h2>
                    </div>
                    <p style={{ fontSize: 14, color: '#6e6e73' }}>{job.company_name} · {job.location} · {job.employment_type}</p>
                  </div>
                  {job.salary_range && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a7f37', background: '#e3f3e3', padding: '0.3rem 0.75rem', borderRadius: 980, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {job.salary_range}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 14, color: '#3d3d3f', lineHeight: 1.6, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.description}
                </p>

                {job.skills && job.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.25rem' }}>
                    {job.skills.slice(0, 6).map((skill: string) => (
                      <span key={skill} style={{ fontSize: 12, padding: '0.25rem 0.6rem', background: '#f0f0f5', borderRadius: 980, color: '#3d3d3f', fontWeight: 500 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: 12, color: '#aeaeb2' }}>
                    Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  {/* Role-based action */}
                  {isBuilder && (
                    <ApplyButton job={job} alreadyApplied={appliedJobIds.includes(job.id)} />
                  )}
                  {isLoggedOut && (
                    <Link href="/login" style={{ padding: '0.5rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      Sign in to apply →
                    </Link>
                  )}
                  {/* Employer/admin — no action button */}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Builder CTA — only for logged-out */}
        {isLoggedOut && (
          <div style={{ marginTop: '3rem', padding: '2rem', background: '#f0f5ff', borderRadius: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.4rem' }}>Are you an AI-native builder?</p>
            <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1rem' }}>Create a free profile and get discovered by companies hiring right now.</p>
            <Link href="/join" style={{ padding: '0.65rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Create free profile →
            </Link>
          </div>
        )}

        {/* Builder — after applying, prompt to check messages */}
        {isBuilder && (
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Applied to a role?</p>
              <p style={{ fontSize: 13, color: '#6e6e73' }}>Your application opens a message thread directly with the employer.</p>
            </div>
            <Link href="/messages" style={{ padding: '0.6rem 1.25rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, fontSize: 13, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}>
              View messages →
            </Link>
          </div>
        )}

        {/* Employer — post a job CTA */}
        {isEmployer && (
          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.2rem' }}>Hiring AI-native talent?</p>
              <p style={{ fontSize: 13, color: '#6e6e73' }}>Post a role and receive applications directly in your ShipStacked inbox.</p>
            </div>
            <Link href="/post-job" style={{ padding: '0.6rem 1.25rem', background: '#0071e3', color: 'white', borderRadius: 980, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
              Post a job →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
