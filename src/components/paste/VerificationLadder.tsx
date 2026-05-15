'use client'

/**
 * Visual rendering of the verification ladder, with the current rung
 * highlighted. See docs/v2/STEP_5_PASTE_UI_SPEC.md §2.2 "Verification ladder
 * preview".
 */

const RUNGS = [
  { id: 'L1', label: 'L1 Artifact Confirmed', sub: 'auto, on publish' },
  { id: 'L2', label: 'L2 Technically Checked', sub: 'auto, minutes after publish' },
  { id: 'L3', label: 'L3 Externally Attested', sub: 'request signature later' },
  { id: 'L4', label: 'L4 Cryptographically Signed', sub: 'future' },
] as const

export default function VerificationLadder({ current }: { current: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
      {RUNGS.map((r) => {
        const active = r.id === current
        return (
          <li
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              background: active ? '#eaf3ff' : 'transparent',
              border: active ? '1px solid #c8defc' : '1px solid transparent',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: active ? '#0071e3' : 'transparent',
                border: active ? '1px solid #0071e3' : '1px solid #c8c8cf',
                flex: '0 0 auto',
              }}
            />
            <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#0a3d80' : '#1d1d1f' }}>
              {r.label}
            </span>
            <span style={{ fontSize: 12, color: '#6e6e73', marginLeft: 'auto' }}>{r.sub}</span>
          </li>
        )
      })}
    </ul>
  )
}
