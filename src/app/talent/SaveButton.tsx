'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ss_saved_profiles'

function getSaved(): Array<{ id: string; name: string; saved_at: string }> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function setSaved(arr: Array<{ id: string; name: string; saved_at: string }>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch {}
}

export function SaveButton({ profileId, profileName }: { profileId: string; profileName: string }) {
  const [saved, setSavedState] = useState(false)

  useEffect(() => {
    setSavedState(getSaved().some(s => s.id === profileId))
  }, [profileId])

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const current = getSaved()
    const idx = current.findIndex(s => s.id === profileId)
    if (idx > -1) {
      current.splice(idx, 1)
    } else {
      current.push({ id: profileId, name: profileName, saved_at: new Date().toISOString() })
    }
    setSaved(current)
    setSavedState(idx === -1)
  }

  return (
    <button
      onClick={toggle}
      title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
      aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
      style={{
        position: 'absolute',
        top: '0.875rem',
        right: '0.875rem',
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: saved ? '#fff3e0' : '#f5f5f7',
        border: `1px solid ${saved ? '#ff9500' : '#e0e0e5'}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        zIndex: 2,
        flexShrink: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? '#ff9500' : 'none'} stroke="#ff9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}
