'use client'

import { useState } from 'react'

export function SaveButton({
  profileId,
  initialSaved = false,
}: {
  profileId: string
  initialSaved?: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setSaved(prev => !prev) // optimistic
    setLoading(true)
    try {
      await fetch('/api/saved-profiles', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
    } catch {
      setSaved(prev => !prev) // revert on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
      aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
      style={{
        position: 'absolute', top: '0.875rem', right: '0.875rem',
        width: 28, height: 28, borderRadius: '50%',
        background: saved ? '#fff3e0' : '#f5f5f7',
        border: `1px solid ${saved ? '#ff9500' : '#e0e0e5'}`,
        cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', zIndex: 2, flexShrink: 0,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24"
        fill={saved ? '#ff9500' : 'none'} stroke="#ff9500"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}
