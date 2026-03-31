'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://claudhire.com/update-password',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {sent ? (
          <div>
            <div style={{ width: 56, height: 56, background: '#e3f3e3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1a7f37', marginBottom: '1.5rem' }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Check your email</h1>
            <p style={{ color: '#6e6e73', fontSize: 14, lineHeight: 1.6, marginBottom: '2rem' }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
            </p>
            <Link href="/login" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none' }}>← Back to login</Link>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Reset password</h1>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
              Remember it? <Link href="/login" style={{ color: '#0071e3', textDecoration: 'none' }}>Sign in →</Link>
            </p>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d2d2d7', borderRadius: 10, fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading || !email}
              style={{ width: '100%', padding: '0.85rem', background: loading || !email ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading || !email ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Sending...' : 'Send reset link →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}