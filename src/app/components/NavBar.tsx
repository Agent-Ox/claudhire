'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type NavUser = {
  email: string
  role: 'employer' | 'builder' | null
}

export default function NavBar() {
  const [navUser, setNavUser] = useState<NavUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const user = session.user
      const metaRole = user.user_metadata?.role as 'employer' | 'builder' | null
      setNavUser({ email: user.email || '', role: metaRole })
      setLoading(false)
    })
  }, [])

  const dashboardLink = navUser?.role === 'employer' ? '/employer' : '/dashboard'

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
      }}>
        {/* Logo */}
        <a href="/" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>
          ClaudHire<span style={{ color: '#0071e3' }}>.</span>
        </a>

        {/* Desktop nav links — hidden on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} className="desktop-nav-links">
          <a href="#how" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>How it works</a>
          <a href="#talent" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>Talent</a>
          <a href="#pricing" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>Pricing</a>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {!loading && navUser ? (
            <>
              <a href={dashboardLink} style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8, whiteSpace: 'nowrap' }} className="desktop-only">
                {navUser.role === 'employer' ? 'Dashboard' : 'My profile'}
              </a>
              <a href="/api/logout" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Sign out
              </a>
            </>
          ) : !loading ? (
            <>
              <a href="/login" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }} className="desktop-only">Sign in</a>
              <Link href="/signup" style={{ background: '#0071e3', color: 'white', padding: '0.4rem 0.9rem', borderRadius: 980, fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Create profile
              </Link>
            </>
          ) : null}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-only"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ display: 'block', width: 22, height: 2, background: '#1d1d1f', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#1d1d1f', borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#1d1d1f', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 99,
          background: 'white', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          <a href="#how" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: '#1d1d1f', textDecoration: 'none', padding: '0.65rem 0', borderBottom: '0.5px solid #f0f0f0' }}>How it works</a>
          <a href="#talent" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: '#1d1d1f', textDecoration: 'none', padding: '0.65rem 0', borderBottom: '0.5px solid #f0f0f0' }}>Talent</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, color: '#1d1d1f', textDecoration: 'none', padding: '0.65rem 0', borderBottom: '0.5px solid #f0f0f0' }}>Pricing</a>
          {navUser ? (
            <>
              <a href={dashboardLink} style={{ fontSize: 15, color: '#0071e3', textDecoration: 'none', padding: '0.65rem 0', borderBottom: '0.5px solid #f0f0f0', fontWeight: 500 }}>
                {navUser.role === 'employer' ? 'Dashboard' : 'My profile'}
              </a>
              <a href="/api/logout" style={{ fontSize: 15, color: '#c00', textDecoration: 'none', padding: '0.65rem 0' }}>Sign out</a>
            </>
          ) : (
            <>
              <a href="/login" style={{ fontSize: 15, color: '#1d1d1f', textDecoration: 'none', padding: '0.65rem 0', borderBottom: '0.5px solid #f0f0f0' }}>Sign in</a>
              <a href="/signup" style={{ fontSize: 15, color: '#0071e3', textDecoration: 'none', padding: '0.65rem 0', fontWeight: 500 }}>Create free profile</a>
            </>
          )}
        </div>
      )}

      <style>{`
        .desktop-nav-links { display: flex; }
        .desktop-only { display: inline; }
        .mobile-only { display: none; }
        @media (max-width: 768px) {
          .desktop-nav-links { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>
    </>
  )
}
