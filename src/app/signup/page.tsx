'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

async function goToCheckout() {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'full_access' })
  })
  const data = await res.json()
  if (data.url) window.location.href = data.url
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'builder' | 'employer'>('builder')
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'employer') setRole('employer')
    const errorParam = searchParams.get('error')
    if (errorParam) setError(decodeURIComponent(errorParam))
  }, [searchParams])

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'builder' } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/join'
    }
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    await goToCheckout()
    setCheckoutLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: '1px solid #d2d2d7', borderRadius: 10,
    fontSize: 15, outline: 'none', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box', marginBottom: '1rem'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem 1.5rem' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', display: 'block', marginBottom: '2rem' }}>
          ShipStacked<span style={{ color: '#0071e3' }}>.</span>
        </a>

        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#1d1d1f' }}>Create account</h1>
        <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '2rem' }}>
          Already have an account? <Link href="/login" style={{ color: '#0071e3', textDecoration: 'none' }}>Sign in</Link>
        </p>

        {/* Role toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.6rem', color: '#1d1d1f' }}>I am a...</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['builder', 'employer'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{
                flex: 1, padding: '0.6rem', borderRadius: 10, border: '1px solid',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                background: role === r ? '#0071e3' : 'white',
                borderColor: role === r ? '#0071e3' : '#d2d2d7',
                color: role === r ? 'white' : '#1d1d1f'
              }}>
                {r === 'builder' ? 'Builder' : 'Employer'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6e6e73', marginTop: '0.5rem' }}>
            {role === 'builder'
              ? 'Create a free profile and showcase your Claude work.'
              : 'Access the full talent directory, Scout AI matching, and unlimited job posts.'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#c00' }}>
            {error}
          </div>
        )}

        {role === 'builder' ? (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: '0.4rem', color: '#1d1d1f' }}>Password</label>
              <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignup()} style={inputStyle} />
            </div>
            <button
              onClick={handleSignup}
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem', background: loading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '0.5rem' }}>
              {loading ? 'Creating account...' : 'Create free profile'}
            </button>
          </>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Access</div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: '#1d1d1f', lineHeight: 1, marginBottom: '0.25rem' }}>
              <sup style={{ fontSize: 20, verticalAlign: 'top', marginTop: 8, display: 'inline-block', fontWeight: 500 }}>$</sup>199
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: '1.5rem' }}>per month</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {['Full talent directory', 'Scout AI concierge matching', 'Direct builder contact', 'Unlimited job posts', 'Public or anonymous profile', 'No commission ever'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#3d3d3f' }}>
                  <span style={{ color: '#0071e3', fontWeight: 700, fontSize: 12 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              style={{ width: '100%', padding: '0.85rem', background: checkoutLoading ? '#d2d2d7' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 15, fontWeight: 600, cursor: checkoutLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {checkoutLoading ? 'Redirecting...' : 'Get full access — $199/mo'}
            </button>
            <p style={{ fontSize: 11, color: '#aeaeb2', marginTop: '0.75rem' }}>
              Instant access after payment. Cancel anytime.
            </p>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
          By continuing you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
