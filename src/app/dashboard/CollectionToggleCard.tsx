'use client'

import { useState } from 'react'

/**
 * Generic per-collection opt-in/opt-out card.
 *
 * Renders for EACH active collection the builder is eligible for
 * (published=true). Zero collections → this component is never
 * rendered (the dashboard's .map returns []). The card has no
 * knowledge of what any particular collection is for; all human-readable
 * specifics come from collection.title and collection.description.
 *
 * No brand / partner / program names in this component. Ever.
 */

export interface CollectionToggleCardProps {
  collection: {
    slug: string
    title: string
    description: string | null
  }
  isOptedIn: boolean
  optedInAt: string | null
  source: 'dashboard' | 'link' | null
}

export default function CollectionToggleCard({
  collection,
  isOptedIn: initialOptedIn,
  optedInAt,
  source,
}: CollectionToggleCardProps) {
  const [isOptedIn, setIsOptedIn] = useState(initialOptedIn)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setSaving(true)
    setError(null)
    const target = !isOptedIn
    try {
      const res = await fetch(
        `/api/collections/${collection.slug}/${target ? 'optin' : 'optout'}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || `HTTP ${res.status}`)
        setSaving(false)
        return
      }
      setIsOptedIn(target)
    } catch (e: any) {
      setError(e?.message ?? 'request_failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e0e0e5',
        borderRadius: 14,
        padding: '1.5rem',
        marginBottom: '1rem',
      }}
      data-collection-card={collection.slug}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Consented collection
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>
            Join {collection.title}
          </p>
          <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            ShipStacked maintains consented, machine-readable collections of builders that approved
            partners can access. Joining {collection.title} includes only data already public on
            your profile (name, role, location, links, skills, GitHub, verified status), at a public
            URL approved partners can access directly. Nothing new is exposed. Opt-in; opt out
            anytime; default is not joined.
          </p>
          {collection.description && (
            <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.55, fontStyle: 'italic', marginBottom: '0.5rem' }}>
              {collection.description}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#aeaeb2', marginBottom: 0 }}>
            Collection URL:{' '}
            <a
              href={`/collections/${collection.slug}`}
              style={{ color: '#0071e3', textDecoration: 'none' }}
              target="_blank"
              rel="noreferrer"
            >
              shipstacked.com/collections/{collection.slug}
            </a>
          </p>
          {isOptedIn && optedInAt && (
            <p style={{ fontSize: 11, color: '#aeaeb2', marginTop: '0.4rem' }}>
              Opted in {new Date(optedInAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {source ? ` via ${source}` : ''}.
            </p>
          )}
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.95rem',
            background: isOptedIn ? '#e3f3e3' : '#f5f5f7',
            color: isOptedIn ? '#1a7f37' : '#6e6e73',
            border: `1px solid ${isOptedIn ? '#b3e0b3' : '#e0e0e5'}`,
            borderRadius: 980,
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOptedIn ? '#1a7f37' : '#aeaeb2' }} />
          {saving ? (isOptedIn ? 'Leaving…' : 'Joining…') : (isOptedIn ? 'In collection' : 'Not in collection')}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: '0.75rem', fontSize: 12, color: '#c53030' }}>
          Update failed: {error}
        </p>
      )}
    </div>
  )
}
