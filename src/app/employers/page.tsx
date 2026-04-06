'use client'

import { useState, useEffect } from 'react'

export default function EmployersPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [builders, setBuilders] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/v1/profiles?limit=6').then(r => r.json()).then(d => setBuilders(d.profiles || [])).catch(() => {})
    fetch('/api/feed/public?limit=4').then(r => r.json()).then(d => setPosts(d.posts || [])).catch(() => {})
  }, [])

  const goToCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'full_access', email }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {}
    setLoading(false)
  }

  const s = { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }

  return (
    <div style={{ ...s, minHeight: '100vh', background: '#fbfbfd', color: '#1d1d1f' }}>

      {/* Hero */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0071e3', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem' }}>For founders and hiring teams</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem', color: '#1d1d1f' }}>
          Hire AI-native builders.<br />No CVs. No agencies.
        </h1>
        <p style={{ fontSize: 18, color: '#6e6e73', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 2.5rem', fontWeight: 400 }}>
          ShipStacked is where verified AI builders showcase real work. Browse proof-of-work profiles, watch the Build Feed, message anyone directly.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: 420, margin: '0 auto' }}>
          <input
            type="email"
            placeholder="your@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goToCheckout()}
            style={{ width: '100%', padding: '0.875rem 1.25rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
          />
          <button
            onClick={goToCheckout}
            disabled={loading}
            style={{ width: '100%', padding: '1rem', background: loading ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
            {loading ? 'Redirecting...' : 'Get full access — $199/mo'}
          </button>
          <p style={{ fontSize: 13, color: '#aeaeb2' }}>No commission. No placement fee. Cancel anytime.</p>
        </div>
      </div>

      {/* What you get */}
      <div style={{ background: 'white', borderTop: '1px solid #e0e0e5', borderBottom: '1px solid #e0e0e5' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {[
            { icon: '🔍', title: 'Browse verified talent', body: 'Every builder has a proof-of-work profile. GitHub activity, real builds, real outcomes.' },
            { icon: '💬', title: 'Message directly', body: 'No middlemen. Contact any builder on the platform. They reply in their ShipStacked inbox.' },
            { icon: '📋', title: 'Post unlimited roles', body: 'List as many roles as you need. Builders apply directly to your dashboard.' },
            { icon: '⚡', title: 'Velocity Score', body: 'Every builder has a score based on GitHub commits, builds shipped, and profile completeness.' },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>{item.icon}</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: '0.4rem' }}>{item.title}</p>
              <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live builders */}
      {builders.length > 0 && (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Live on the platform</p>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '1.5rem' }}>Real builders. Real proof of work.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {builders.map((b: any) => {
              const initials = b.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
              return (
                <a key={b.id} href={'/u/' + b.username} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', background: 'white', border: '1px solid #e0e0e5', borderRadius: 14, padding: '1.25rem', textDecoration: 'none', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f1fd, #d0e4fb)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {b.avatar_url
                        ? <img src={b.avatar_url} alt={b.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 14, fontWeight: 700, color: '#0071e3' }}>{initials}</span>
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {b.full_name}
                        {b.verified && <span style={{ fontSize: 10, fontWeight: 600, color: '#0071e3', background: '#e8f1fd', padding: '0.1rem 0.35rem', borderRadius: 980 }}>✓</span>}
                      </p>
                      <p style={{ fontSize: 12, color: '#6e6e73' }}>{b.role || b.primary_profession || 'Builder'}</p>
                    </div>
                  </div>
                  {b.bio && <p style={{ fontSize: 13, color: '#3d3d3f', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.bio}</p>}
                  {b.location && <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: '0.5rem' }}>{b.location}</p>}
                </a>
              )
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/talent" style={{ fontSize: 14, color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}>Browse all builders →</a>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div style={{ background: '#f5f5f7', borderTop: '1px solid #e0e0e5' }} id="pricing">
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Simple pricing</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: '#1d1d1f', marginBottom: '0.5rem' }}>$199 / month</h2>
          <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: '2rem', lineHeight: 1.6 }}>Everything included. No placement fees. No commissions. Cancel anytime.</p>
          <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
            {[
              'Unlimited access to the talent directory',
              'Direct messaging with any builder',
              'Unlimited job postings',
              'Company profile page',
              'Application inbox',
              'Velocity Score rankings',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '0.5px solid #f0f0f5' }}>
                <span style={{ color: '#1a7f37', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: '#1d1d1f' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              placeholder="your@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToCheckout()}
              style={{ width: '100%', padding: '0.875rem 1.25rem', border: '1px solid #d2d2d7', borderRadius: 12, fontSize: 16, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
            />
            <button
              onClick={goToCheckout}
              disabled={loading}
              style={{ width: '100%', padding: '1rem', background: loading ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Redirecting...' : 'Get full access — $199/mo'}
            </button>
            <p style={{ fontSize: 13, color: '#aeaeb2' }}>No commission. No placement fee. Cancel anytime.</p>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>ShipStacked<span style={{ color: '#0071e3' }}>.</span></a>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/talent" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Browse talent</a>
          <a href="/feed" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Build Feed</a>
          <a href="/jobs" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Jobs</a>
          <a href="/login" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>Sign in</a>
        </div>
      </div>

    </div>
  )
}
