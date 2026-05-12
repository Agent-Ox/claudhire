'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'this_month', label: 'This month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'within_6_months', label: 'Within 6 months' },
  { value: 'exploring', label: 'Just exploring' },
]

const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'under_50k', label: 'Under $50K' },
  { value: '50k_200k', label: '$50K – $200K' },
  { value: '200k_500k', label: '$200K – $500K' },
  { value: '500k_plus', label: '$500K+' },
  { value: 'discuss', label: 'Need to discuss' },
]

const s = {
  form: {
    width: '100%',
    maxWidth: 640,
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
  fieldset: {
    border: 'none',
    padding: 0,
    margin: 0,
  } as React.CSSProperties,
  legend: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#1d1d1f',
    lineHeight: 1.5,
    marginBottom: '0.625rem',
    padding: 0,
  } as React.CSSProperties,
  radioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.5rem',
  } as React.CSSProperties,
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.7rem 0.875rem',
    border: '1px solid #d4d4d8',
    borderRadius: 10,
    fontSize: 14,
    color: '#1d1d1f',
    cursor: 'pointer',
    background: '#ffffff',
    transition: 'border-color 0.15s, background 0.15s',
    userSelect: 'none' as const,
  } as React.CSSProperties,
  radioLabelChecked: {
    borderColor: '#0071e3',
    background: '#e8f1fd',
  } as React.CSSProperties,
  radioInput: {
    accentColor: '#0071e3',
    width: 16,
    height: 16,
    margin: 0,
    flexShrink: 0,
  } as React.CSSProperties,
  groupHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0071e3',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    margin: '2.5rem 0 1rem',
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

export default function HireIntakeForm() {
  const router = useRouter()

  const [symptom, setSymptom] = useState('')
  const [priorRoleTitle, setPriorRoleTitle] = useState('')
  const [urgency, setUrgency] = useState('')
  const [budget, setBudget] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const symptomCount = symptom.length
  const symptomTooShort = symptomCount < 200
  const canSubmit =
    !submitting &&
    !symptomTooShort &&
    symptomCount <= 2000 &&
    !!urgency &&
    !!budget &&
    !!name.trim() &&
    !!email.trim() &&
    email.includes('@') &&
    !!company.trim() &&
    !!role.trim()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/intakes/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom,
          prior_role_title: priorRoleTitle,
          urgency,
          budget,
          name,
          email,
          company,
          role,
          linkedin_url: linkedinUrl,
        }),
      })

      let body: { ok?: boolean; error?: string } = {}
      try {
        body = await res.json()
      } catch {
        /* response wasn't JSON — fall through to generic error */
      }

      if (res.ok && body.ok === true) {
        router.push('/hire/thanks')
        return
      }

      setError(
        body.error ||
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
      {/* Q1 — symptom */}
      <div style={s.field}>
        <label htmlFor="symptom" style={s.label}>
          What&apos;s broken in your operations, or what are you trying to ship?
        </label>
        <textarea
          id="symptom"
          name="symptom"
          required
          aria-required="true"
          rows={5}
          maxLength={2000}
          placeholder="Be specific. What's actually broken or stalled? What would success look like in 90 days?"
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          style={s.textarea}
        />
        <div style={{ ...s.counter, ...(symptomTooShort ? s.counterWarning : {}) }}>
          {symptomTooShort
            ? `${symptomCount}/2000 — need at least ${200 - symptomCount} more`
            : `${symptomCount}/2000`}
        </div>
      </div>

      {/* Q2 — prior role title */}
      <div style={s.field}>
        <label htmlFor="prior_role_title" style={s.label}>
          Have you tried to hire for this and failed? If yes, what role title did you post?{' '}
          <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="prior_role_title"
          name="prior_role_title"
          type="text"
          maxLength={200}
          placeholder="e.g. Senior AI Engineer, Solutions Architect — or leave blank if you haven't tried yet"
          value={priorRoleTitle}
          onChange={(e) => setPriorRoleTitle(e.target.value)}
          style={s.input}
        />
      </div>

      {/* Q3 — urgency */}
      <fieldset style={{ ...s.fieldset, ...s.field }}>
        <legend style={s.legend}>When does this need to be solved?</legend>
        <div style={s.radioGrid}>
          {URGENCY_OPTIONS.map((opt) => {
            const checked = urgency === opt.value
            return (
              <label
                key={opt.value}
                style={{ ...s.radioLabel, ...(checked ? s.radioLabelChecked : {}) }}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setUrgency(opt.value)}
                  aria-required="true"
                  required
                  style={s.radioInput}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Q4 — budget */}
      <fieldset style={{ ...s.fieldset, ...s.field }}>
        <legend style={s.legend}>Realistic budget to solve this</legend>
        <div style={s.radioGrid}>
          {BUDGET_OPTIONS.map((opt) => {
            const checked = budget === opt.value
            return (
              <label
                key={opt.value}
                style={{ ...s.radioLabel, ...(checked ? s.radioLabelChecked : {}) }}
              >
                <input
                  type="radio"
                  name="budget"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setBudget(opt.value)}
                  aria-required="true"
                  required
                  style={s.radioInput}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Q5 — contact block */}
      <h2 style={s.groupHeading}>Your details</h2>

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
        <label htmlFor="company" style={s.label}>Company</label>
        <input
          id="company"
          name="company"
          type="text"
          required
          aria-required="true"
          maxLength={200}
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="role" style={s.label}>Your role/title</label>
        <input
          id="role"
          name="role"
          type="text"
          required
          aria-required="true"
          maxLength={200}
          autoComplete="organization-title"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={s.input}
        />
      </div>

      <div style={s.field}>
        <label htmlFor="linkedin_url" style={s.label}>
          LinkedIn URL <span style={s.optional}>(optional)</span>
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          inputMode="url"
          pattern="https?://.*"
          placeholder="https://linkedin.com/in/..."
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          style={s.input}
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
        {submitting ? 'Sending...' : 'Send to Thomas'}
      </button>

      <p style={s.reassurance}>I read these personally. 24-hour reply, every time.</p>
    </form>
  )
}
