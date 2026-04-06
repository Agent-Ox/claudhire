'use client'

import { useState } from 'react'

export default function ClientInboxGate() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      await fetch('/api/client-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '3rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {sent ? (
          <div>
            <div style={{ width: 56, height: 56, background: '#e3f3e3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: '1.5rem' }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', marginBottom: '0.5rem' }}>Check your email</h1>
            <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6 }}>
              If that email has an account, we have sent a link to access your inbox. It expires in 60 minutes.
            </p>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#1d1d1f', marginBottom: '0.4rem' }}>Access your inbox</h1>
            <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: '2rem', lineHeight: 1.6 }}>
              Enter the email you used to send your enquiry and we will send you a fresh link.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', padding: '0.875rem 1rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#c00', marginBottom: '0.75rem' }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={sending || !email.trim()}
              style={{ width: '100%', padding: '0.95rem', background: sending || !email.trim() ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 16, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {sending ? 'Sending...' : 'Send me a link →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
