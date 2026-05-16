'use client'

import { useState } from 'react'

export default function OptinConfirmButton({ slug, token }: { slug: string; token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function confirm() {
    setState('sending')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/collections/${slug}/optin/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setState('success')
        return
      }
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || `HTTP ${res.status}`)
      setState('error')
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'request_failed')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div style={{ background: '#e3f3e3', border: '1px solid #b3e0b3', borderRadius: 14, padding: '1.25rem 1.5rem' }}>
        <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 600, marginBottom: '0.25rem' }}>
          You&apos;re in.
        </p>
        <p style={{ fontSize: 13, color: '#1a7f37' }}>
          Your profile is now part of the collection. You can opt out anytime from your dashboard.
        </p>
        <a
          href={`/collections/${slug}`}
          style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}
        >
          See the collection →
        </a>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={confirm}
        disabled={state === 'sending'}
        style={{
          background: '#0071e3',
          color: 'white',
          border: 'none',
          borderRadius: 980,
          padding: '0.75rem 1.5rem',
          fontSize: 14,
          fontWeight: 600,
          cursor: state === 'sending' ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {state === 'sending' ? 'Joining…' : 'Yes, add me to this collection'}
      </button>
      {errorMsg && (
        <p style={{ marginTop: '0.75rem', fontSize: 13, color: '#c53030' }}>
          Could not join: {errorMsg}
        </p>
      )}
    </div>
  )
}
