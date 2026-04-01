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
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2rem',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '0.5px solid rgba(0,0,0,0.1)',
    }}>
      <a href="/" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', textDecoration: 'none', letterSpacing: '-0.02em' }}>
        ClaudHire<span style={{ color: '#0071e3' }}>.</span>
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <a href="#how" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>How it works</a>
        <a href="#talent" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>Talent</a>
        <a href="#pricing" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>Pricing</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {loading ? null : navUser ? (
          <>
            <a href={dashboardLink} style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>
              {navUser.role === 'employer' ? 'Dashboard' : 'My profile'}
            </a>
            <a href="/api/logout" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', background: '#f5f5f7', color: '#1d1d1f', borderRadius: 980, textDecoration: 'none', fontWeight: 500 }}>
              Sign out
            </a>
          </>
        ) : (
          <>
            <a href="/login" style={{ fontSize: '0.8rem', color: '#1d1d1f', textDecoration: 'none', opacity: 0.8 }}>Sign in</a>
            <Link href="/signup" style={{ background: '#0071e3', color: 'white', padding: '0.4rem 1rem', borderRadius: 980, fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}>
              Create profile
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
