'use client'

/**
 * Searchable dropdown for adding Atlas roles. Loads the v0.4 role list
 * client-side (small, ~40 entries). See STEP_5_PASTE_UI_SPEC §2.2.
 */

import { useMemo, useRef, useState, useEffect } from 'react'
import type { AtlasRole } from '@/services/atlas-classifier/roles'

export default function AtlasRoleSelector({
  allRoles,
  excludeIds,
  onAdd,
}: {
  allRoles: AtlasRole[]
  excludeIds: string[]
  onAdd: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = allRoles.filter((r) => !excluded.has(r.id))
    if (!q) return pool.slice(0, 8)
    return pool
      .filter((r) => r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [allRoles, excluded, query])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: '0.4rem 0.75rem', fontSize: 13, fontWeight: 500, color: '#0071e3', background: 'transparent', border: '1px dashed #c8defc', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        + Add role
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 10, top: 'calc(100% + 4px)', left: 0, width: 320, background: 'white', border: '1px solid #d2d2d7', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search Atlas roles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e3e3e8', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.4rem' }}
          />
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 260, overflowY: 'auto' }}>
            {matches.length === 0 ? (
              <li style={{ padding: '0.5rem 0.6rem', fontSize: 13, color: '#6e6e73' }}>No matches.</li>
            ) : (
              matches.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(r.id)
                      setQuery('')
                      setOpen(false)
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem', background: 'transparent', border: 'none', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: '#1d1d1f', display: 'flex', gap: '0.6rem' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f4f6fb')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 600, color: '#0071e3', minWidth: 28 }}>{r.id}</span>
                    <span>{r.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
