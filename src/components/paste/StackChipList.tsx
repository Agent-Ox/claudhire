'use client'

/**
 * Stack-element chip list with inline removal and a small searchable adder
 * backed by `src/config/stack-vocab.json`. See STEP_5_PASTE_UI_SPEC §2.2.
 */

import { useMemo, useRef, useState, useEffect } from 'react'
import type { StackElement } from '@/schemas/proof-receipt-v0.1'

type StackCategory = StackElement['category']
type StackRole = StackElement['role']

const ROLE_ORDER: Record<StackRole, number> = { primary: 0, secondary: 1, supporting: 2 }
const CATEGORY_LABEL: Record<StackCategory, string> = {
  model: 'Model',
  framework: 'Framework',
  infra: 'Infra',
  tool: 'Tool',
  language: 'Language',
  service: 'Service',
}

export default function StackChipList({
  value,
  onChange,
  vocab,
}: {
  value: StackElement[]
  onChange: (next: StackElement[]) => void
  vocab: Record<string, string[]>
}) {
  const [adderOpen, setAdderOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const sorted = useMemo(() => {
    return [...value].sort((a, b) => (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) || a.name.localeCompare(b.name))
  }, [value])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const existing = new Set(value.map((s) => s.name.toLowerCase()))
    const out: { name: string; category: StackCategory }[] = []
    for (const [cat, names] of Object.entries(vocab)) {
      const category = cat as StackCategory
      for (const name of names) {
        const lower = name.toLowerCase()
        if (existing.has(lower)) continue
        if (!q || lower.includes(q)) out.push({ name, category })
        if (out.length >= 16) break
      }
      if (out.length >= 16) break
    }
    return out
  }, [vocab, query, value])

  useEffect(() => {
    if (!adderOpen) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAdderOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [adderOpen])

  function remove(name: string) {
    onChange(value.filter((s) => s.name !== name))
  }

  function add(name: string, category: StackCategory) {
    onChange([...value, { name, category, role: 'supporting' }])
    setQuery('')
    setAdderOpen(false)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
      {sorted.map((s) => (
        <span
          key={`${s.category}:${s.name}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.6rem 0.3rem 0.75rem',
            borderRadius: 999,
            background: s.role === 'primary' ? '#eaf3ff' : '#f4f4f6',
            color: '#1d1d1f',
            fontSize: 13,
            fontWeight: 500,
            border: s.role === 'primary' ? '1px solid #c8defc' : '1px solid #e3e3e8',
          }}
        >
          <span>{s.name}</span>
          {s.version && <span style={{ color: '#6e6e73', fontSize: 12 }}>{s.version}</span>}
          <button
            type="button"
            onClick={() => remove(s.name)}
            aria-label={`Remove ${s.name}`}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#6e6e73', fontSize: 16, lineHeight: 1, marginLeft: 2 }}
          >
            ×
          </button>
        </span>
      ))}

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setAdderOpen((v) => !v)}
          style={{ padding: '0.3rem 0.7rem', fontSize: 13, fontWeight: 500, color: '#0071e3', background: 'transparent', border: '1px dashed #c8defc', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Add
        </button>
        {adderOpen && (
          <div style={{ position: 'absolute', zIndex: 10, top: 'calc(100% + 4px)', left: 0, width: 280, background: 'white', border: '1px solid #d2d2d7', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search stack…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e3e3e8', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.4rem' }}
            />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 240, overflowY: 'auto' }}>
              {matches.length === 0 ? (
                <li style={{ padding: '0.5rem 0.6rem', fontSize: 13, color: '#6e6e73' }}>No matches.</li>
              ) : (
                matches.map((m) => (
                  <li key={`${m.category}:${m.name}`}>
                    <button
                      type="button"
                      onClick={() => add(m.name, m.category)}
                      style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', background: 'transparent', border: 'none', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: '#1d1d1f', display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#f4f6fb')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{m.name}</span>
                      <span style={{ color: '#86868b', fontSize: 12 }}>{CATEGORY_LABEL[m.category]}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
