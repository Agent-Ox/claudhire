'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = '/talent'
      }
    })
    // Also check immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/talent'
      }
    })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#6e6e73' }}>Signing you in...</p>
      </div>
    </div>
  )
}
