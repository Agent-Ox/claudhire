'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ATLAS_ROLE_LABELS: Record<string, string> = {
  A1: 'A1 AI Integration Operator',
  A2: 'A2 Forward Deployed Engineer',
  A3: 'A3 AI Deployment Triage Specialist',
  A4: 'A4 Agent Workflow Implementer',
  A5: 'A5 Agent System Integrator',
  A6: 'A6 Deployment Strategist',
  A7: 'A7 Partner / Channel Solutions Architect',
  B1: 'B1 AI Operations Engineer',
  B2: 'B2 Agent Reliability Engineer',
  B3: 'B3 AI Cost & Capacity Operator',
  B4: 'B4 AI Inference & Model Serving Reliability Engineer',
  C1: 'C1 AI Audit & Conformity Lead',
  C2: 'C2 AI Risk & Policy Analyst',
  C3: 'C3 Model & Vendor Governance Manager',
  C4: 'C4 AI Agent Steward',
  C5: 'C5 AI Incident Responder',
  C6: 'C6 AI Red Team Lead',
  C7: 'C7 Data Provenance & Training-Data Compliance Officer',
  C8: 'C8 AI Procurement & Vendor Risk Assessor',
  C9: 'C9 Vulnerable User Protection Lead',
  D1: 'D1 AI Workflow Designer',
  D2: 'D2 Agent System Architect',
  D3: 'D3 Prompt and Context Engineer',
  D4: 'D4 Human-AI Handoff Designer',
  D5: 'D5 AI Evaluations Engineer',
  E1: 'E1 AI Implementation Lead',
  E2: 'E2 AI Enablement Trainer',
  E3: 'E3 AI Translator',
  E4: 'E4 Fractional Head of AI',
  F1: 'F1 Solo Agent Operator',
  F2: 'F2 Boutique Agent Operator',
  F3: 'F3 Vertical Agent Operator',
  F4: 'F4 Function Agent Operator',
  F5: 'F5 Integration Agent Operator',
}

const ATLAS_CLUSTERS: { name: string; codes: string[] }[] = [
  { name: 'Cluster A — Implementation & Deployment', codes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'] },
  { name: 'Cluster B — Reliability & Operations', codes: ['B1', 'B2', 'B3', 'B4'] },
  { name: 'Cluster C — Governance, Risk & Compliance', codes: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'] },
  { name: 'Cluster D — Design & Architecture', codes: ['D1', 'D2', 'D3', 'D4', 'D5'] },
  { name: 'Cluster E — Translation & Enablement', codes: ['E1', 'E2', 'E3', 'E4'] },
  { name: 'Part II — Operators', codes: ['F1', 'F2', 'F3', 'F4', 'F5'] },
]

const VERTICAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'legal', label: 'Legal' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'defense', label: 'Defense / Government' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'other', label: 'Other' },
]

const ENGAGEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'employed', label: 'Employed full-time' },
  { value: 'fractional', label: 'Fractional / advisory' },
  { value: 'operator', label: 'Operator (I run agent fleets for customers)' },
  { value: 'contract', label: 'Contract / project work' },
  { value: 'not_looking', label: 'Not currently looking — just want to be in the pool' },
]

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

const s = {
  form: {
    width: '100%',
    maxWidth: 720,
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1d1d1f',
  } as React.CSSProperties,
  field: {
    marginBottom: '1.75rem',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#1d1d1f',
    lineHeight: 1.5,
    marginBottom: '0.5rem',
    letterSpacing: '-0.005em',
  } as React.CSSProperties,
  optional: {
    color: '#6e6e73',
    fontWeight: 400,
  } as React.CSSProperties,
  helper: {
    fontSize: 13,
    color: '#6e6e73',
    lineHeight: 1.55,
    marginTop: '0.5rem',
  } as React.CSSProperties,
  helperAbove: {
    fontSize: 13,
    color: '#6e6e73',
    lineHeight: 1.55,
    marginBottom: '0.875rem',
    marginTop: '-0.125rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    fontSize: 15,
    color: '#1d1d1f',
    background: '#ffffff',
    border: '1px solid #d4d4d8',
    borderRadius: 10,
    padding: '0.7rem 0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    fontSize: 15,
    color: '#1d1d1f',
    background: '#ffffff',
    border: '1px solid #d4d4d8',
    borderRadius: 10,
    padding: '0.75rem 0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical' as const,
    lineHeight: 1.6,
    minHeight: '8rem',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  } as React.CSSProperties,
  counter: {
    fontSize: 12,
    color: '#6e6e73',
    marginTop: '0.375rem',
    textAlign: 'right' as const,
  } as React.CSSProperties,
  counterWarning: {
    color: '#9a3412',
  } as React.CSSProperties,
  groupHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0071e3',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    marginTop: '2.75rem',
    marginRight: 0,
    marginBottom: '1rem',
    marginLeft: 0,
  } as React.CSSProperties,
  fieldset: {
    border: 'none',
    padding: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  } as React.CSSProperties,
  clusterFieldset: {
    border: 'none',
    padding: 0,
    margin: '0 0 1.25rem',
  } as React.CSSProperties,
  clusterLegend: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6e6e73',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.5rem',
    padding: 0,
  } as React.CSSProperties,
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.5rem',
  } as React.CSSProperties,
  verticalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.5rem',
  } as React.CSSProperties,
  engagementGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.5rem',
  } as React.CSSProperties,
  checkCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.65rem 0.875rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d4d4d8',
    borderRadius: 10,
    fontSize: 14,
    color: '#1d1d1f',
    cursor: 'pointer',
    background: '#ffffff',
    transition: 'border-color 0.15s, background 0.15s',
    userSelect: 'none' as const,
    lineHeight: 1.4,
  } as React.CSSProperties,
  checkCardChecked: {
    borderColor: '#0071e3',
    background: '#e8f1fd',
  } as React.CSSProperties,
  checkboxInput: {
    accentColor: '#0071e3',
    width: 16,
    height: 16,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  countLine: {
    fontSize: 13,
    color: '#6e6e73',
    marginBottom: '1rem',
    fontVariantNumeric: 'tabular-nums' as const,
  } as React.CSSProperties,
  countLineWarning: {
    color: '#9a3412',
    fontWeight: 600,
  } as React.CSSProperties,
  domainReveal: {
    marginTop: '0.875rem',
  } as React.CSSProperties,
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    fontSize: 14,
    lineHeight: 1.55,
    marginBottom: '1rem',
  } as React.CSSProperties,
  submit: {
    width: '100%',
    padding: '1rem 2rem',
    background: '#0071e3',
    color: '#ffffff',
    border: 'none',
    borderRadius: 980,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, opacity 0.15s',
  } as React.CSSProperties,
  submitDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  reassurance: {
    fontSize: 13,
    color: '#6e6e73',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    marginTop: '0.875rem',
    marginBottom: 0,
  } as React.CSSProperties,
}

export default function ClaimForm() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [atlasRoles, setAtlasRoles] = useState<string[]>([])
  const [verticals, setVerticals] = useState<string[]>([])
  const [domainPractitioner, setDomainPractitioner] = useState(false)
  const [domainField, setDomainField] = useState('')
  const [proofOfWork, setProofOfWork] = useState('')
  const [engagementModes, setEngagementModes] = useState<string[]>([])
  const [compExpectation, setCompExpectation] = useState('')
  const [notes, setNotes] = useState('')

  const [atlasRolesTouched, setAtlasRolesTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const proofCount = proofOfWork.length
  const proofTooShort = proofCount < 100
  const rolesCount = atlasRoles.length
  const rolesEmpty = rolesCount === 0
  const showRolesWarning = atlasRolesTouched && rolesEmpty

  const canSubmit =
    !submitting &&
    !!name.trim() &&
    !!email.trim() &&
    email.includes('@') &&
    rolesCount >= 1 &&
    !proofTooShort &&
    proofCount <= 3000 &&
    engagementModes.length >= 1

  function toggleAtlasRole(code: string) {
    setAtlasRolesTouched(true)
    setAtlasRoles((prev) => toggle(prev, code))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    const body: Record<string, unknown> = {
      name,
      email,
      location,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      twitter_url: twitterUrl,
      website_url: websiteUrl,
      atlas_roles: atlasRoles,
      domain_practitioner: domainPractitioner,
      proof_of_work: proofOfWork,
      engagement_modes: engagementModes,
      comp_expectation: compExpectation,
      notes,
    }
    if (verticals.length) body.verticals = verticals
    if (domainPractitioner && domainField.trim()) body.domain_field = domainField

    try {
      const res = await fetch('/api/intakes/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let json: { ok?: boolean; error?: string } = {}
      try {
        json = await res.json()
      } catch {
        /* fall through */
      }

      if (res.ok && json.ok === true) {
        router.push('/claim/thanks')
        return
      }

      setError(
        json.error ||
          'Something went wrong. Please try again or email hello@shipstacked.com directly.',
      )
      setSubmitting(false)
    } catch {
      setError("Couldn't reach the server. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <form style={s.form} onSubmit={handleSubmit} noValidate>
      {/* SECTION 1 — Your identity */}
      <h2 style={{ ...s.groupHeading, marginTop: 0 }}>Your identity</h2>

      <div style={s.field}>
        <label htmlFor="name" style={s.label}>Your name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          aria-required="true"
          maxLength={200}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="email" style={s.label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-required="true"
          maxLength={320}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="location" style={s.label}>
          Where are you based? <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          maxLength={200}
          autoComplete="address-level2"
          placeholder="City, country"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={s.input}
        />
      </div>

      {/* SECTION 2 — Where to find your work */}
      <h2 style={s.groupHeading}>Where to find your work</h2>

      <div style={s.field}>
        <label htmlFor="linkedin_url" style={s.label}>
          LinkedIn URL <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          inputMode="url"
          placeholder="https://linkedin.com/in/..."
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="github_url" style={s.label}>
          GitHub URL <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="github_url"
          name="github_url"
          type="url"
          inputMode="url"
          placeholder="https://github.com/..."
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="twitter_url" style={s.label}>
          Twitter / X URL <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="twitter_url"
          name="twitter_url"
          type="url"
          inputMode="url"
          placeholder="https://x.com/..."
          value={twitterUrl}
          onChange={(e) => setTwitterUrl(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="website_url" style={s.label}>
          Personal site or blog <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          style={s.input}
        />
        <p style={s.helper}>
          At least one URL helps me find your work. None of these are required, but the more public proof you can point to, the faster vetting goes.
        </p>
      </div>

      {/* SECTION 3 — Atlas roles */}
      <h2 style={s.groupHeading}>Which Atlas role(s) describe you?</h2>
      <p style={s.helperAbove}>
        Multi-select. If you do work across multiple roles, claim all that fit. The bar is: you&apos;ve actually shipped this work, not that you could in theory.
      </p>
      <p
        style={{ ...s.countLine, ...(showRolesWarning ? s.countLineWarning : {}) }}
        aria-live="polite"
      >
        {showRolesWarning
          ? '0 selected — pick at least one role to claim'
          : `${rolesCount} selected`}
      </p>

      {ATLAS_CLUSTERS.map((cluster) => (
        <fieldset key={cluster.name} style={s.clusterFieldset}>
          <legend style={s.clusterLegend}>{cluster.name}</legend>
          <div style={s.roleGrid}>
            {cluster.codes.map((code) => {
              const checked = atlasRoles.includes(code)
              return (
                <label
                  key={code}
                  style={{ ...s.checkCard, ...(checked ? s.checkCardChecked : {}) }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAtlasRole(code)}
                    style={s.checkboxInput}
                  />
                  <span>{ATLAS_ROLE_LABELS[code]}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      {/* SECTION 4 — Verticals */}
      <h2 style={s.groupHeading}>
        Vertical specialization <span style={s.optional}>(optional)</span>
      </h2>
      <p style={s.helperAbove}>
        Select any verticals where you&apos;ve shipped substantial work.
      </p>
      <fieldset style={{ ...s.fieldset, ...s.field }}>
        <legend style={{ position: 'absolute' as const, left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          Vertical specialization
        </legend>
        <div style={s.verticalGrid}>
          {VERTICAL_OPTIONS.map((opt) => {
            const checked = verticals.includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{ ...s.checkCard, ...(checked ? s.checkCardChecked : {}) }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setVerticals((prev) => toggle(prev, opt.value))}
                  style={s.checkboxInput}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* SECTION 5 — Domain practitioner */}
      <h2 style={s.groupHeading}>
        Domain practitioner with integrated AI <span style={s.optional}>(optional)</span>
      </h2>
      <label
        style={{ ...s.checkCard, ...(domainPractitioner ? s.checkCardChecked : {}), alignItems: 'flex-start' }}
      >
        <input
          type="checkbox"
          checked={domainPractitioner}
          onChange={(e) => setDomainPractitioner(e.target.checked)}
          style={{ ...s.checkboxInput, marginTop: 2 }}
        />
        <span>
          I&apos;m a domain practitioner (lawyer, doctor, accountant, architect, financial advisor, etc.) who has deeply integrated AI into my primary professional work.
        </span>
      </label>
      {domainPractitioner && (
        <div style={s.domainReveal}>
          <label htmlFor="domain_field" style={s.label}>What&apos;s your primary profession?</label>
          <input
            id="domain_field"
            name="domain_field"
            type="text"
            maxLength={200}
            placeholder="e.g. Corporate lawyer, Radiologist, Architect"
            value={domainField}
            onChange={(e) => setDomainField(e.target.value)}
            style={s.input}
          />
        </div>
      )}
      <p style={s.helper}>
        This is a distinct supply category in the Atlas. Domain expertise plus AI integration is structurally undersupplied and commands premium engagements.
      </p>

      {/* SECTION 6 — Proof of work */}
      <h2 style={s.groupHeading}>Proof of work</h2>
      <p style={s.helperAbove}>
        Describe 1–5 specific things you&apos;ve shipped. Include links wherever possible. Public case studies, GitHub repos, conference talks, named-company case studies. The more specific and verifiable, the faster vetting goes.
      </p>
      <div style={s.field}>
        <label htmlFor="proof_of_work" style={{ ...s.label, position: 'absolute' as const, left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          Proof of work
        </label>
        <textarea
          id="proof_of_work"
          name="proof_of_work"
          required
          aria-required="true"
          rows={6}
          maxLength={3000}
          placeholder="Example: 'Built the AI document review pipeline at [firm] in 2024 — example.com/post1. Shipped a contract intelligence layer for [fintech] — example.com/post2. Three more in private engagements I cannot link publicly but can describe.'"
          value={proofOfWork}
          onChange={(e) => setProofOfWork(e.target.value)}
          style={s.textarea}
        />
        <div style={{ ...s.counter, ...(proofTooShort ? s.counterWarning : {}) }}>
          {proofTooShort
            ? `${proofCount}/3000 — need at least ${100 - proofCount} more`
            : `${proofCount}/3000`}
        </div>
      </div>

      {/* SECTION 7 — Availability */}
      <h2 style={s.groupHeading}>Availability</h2>
      <p style={s.helperAbove}>
        Select all that apply. &ldquo;Not currently looking&rdquo; is fine — staying in the pool keeps you on radar for the right opportunity.
      </p>
      <fieldset style={{ ...s.fieldset, ...s.field }}>
        <legend style={{ position: 'absolute' as const, left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          Availability
        </legend>
        <div style={s.engagementGrid}>
          {ENGAGEMENT_OPTIONS.map((opt) => {
            const checked = engagementModes.includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{ ...s.checkCard, ...(checked ? s.checkCardChecked : {}) }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setEngagementModes((prev) => toggle(prev, opt.value))}
                  style={s.checkboxInput}
                  aria-required="true"
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* SECTION 8 — Comp */}
      <h2 style={s.groupHeading}>
        Compensation expectation <span style={s.optional}>(optional)</span>
      </h2>
      <p style={s.helperAbove}>
        Free text. Examples: &ldquo;€100–150K base&rdquo;, &ldquo;$200/hr fractional&rdquo;, &ldquo;Per-engagement for operator work&rdquo;, &ldquo;Not disclosing yet.&rdquo; Saves a round-trip if you have a number in mind.
      </p>
      <div style={s.field}>
        <label htmlFor="comp_expectation" style={{ ...s.label, position: 'absolute' as const, left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          Compensation expectation
        </label>
        <input
          id="comp_expectation"
          name="comp_expectation"
          type="text"
          maxLength={500}
          value={compExpectation}
          onChange={(e) => setCompExpectation(e.target.value)}
          style={s.input}
        />
      </div>

      {/* SECTION 9 — Notes */}
      <h2 style={s.groupHeading}>
        Anything else worth knowing? <span style={s.optional}>(optional)</span>
      </h2>
      <p style={s.helperAbove}>
        Languages, geographies, sectors you&apos;d avoid, hard constraints — anything that affects routing.
      </p>
      <div style={s.field}>
        <label htmlFor="notes" style={{ ...s.label, position: 'absolute' as const, left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...s.textarea, minHeight: '5rem' }}
        />
      </div>

      {error && (
        <div role="alert" style={s.errorBox}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{ ...s.submit, ...(!canSubmit ? s.submitDisabled : {}) }}
      >
        {submitting ? 'Sending...' : 'Claim my role'}
      </button>

      <p style={s.reassurance}>
        I read these personally. The bar is real — not every claim becomes routable.
      </p>
    </form>
  )
}
