'use client'

// Batch 5 D5=(a): admin-only "Re-enrich entity" button. POSTs to
// /api/enrich?force=1 with the target profile_id; the route handler
// applies admin auth + bypasses the per-entity retry cap and the D2
// fingerprint short-circuit. Rate cap (D8) still applies.

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'accepted' | 'skipped' | 'error'

export default function EnrichButton({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const trigger = async () => {
    setStatus('sending')
    setMessage(null)
    try {
      const res = await fetch('/api/enrich?force=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
      const data = await res.json()
      if (res.status === 202) {
        setStatus('accepted')
        setMessage(`run #${data.run_id} (attempt ${data.attempt_count})`)
      } else if (res.status === 429) {
        setStatus('skipped')
        setMessage(data.reason || 'rate-limited')
      } else if (data.skipped) {
        setStatus('skipped')
        setMessage(data.reason || 'skipped')
      } else {
        setStatus('error')
        setMessage(data.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || 'network error')
    }
    // Reset back to idle after 8s so the button can be retried.
    setTimeout(() => { setStatus('idle'); setMessage(null) }, 8000)
  }

  const colorByStatus: Record<Status, { bg: string; fg: string }> = {
    idle:     { bg: '#f5f5f7', fg: '#1d1d1f' },
    sending:  { bg: '#f5f5f7', fg: '#aeaeb2' },
    accepted: { bg: '#e3f3e3', fg: '#1a7f37' },
    skipped:  { bg: '#fff4e6', fg: '#bf7e00' },
    error:    { bg: '#fff0f0', fg: '#c00' },
  }
  const c = colorByStatus[status]

  return (
    <button
      onClick={trigger}
      disabled={status === 'sending'}
      title={message || 'Force re-enrichment for this entity'}
      style={{
        fontSize: 12, fontWeight: 600,
        padding: '0.2rem 0.6rem',
        borderRadius: 6,
        border: 'none',
        cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        background: c.bg,
        color: c.fg,
        opacity: status === 'sending' ? 0.6 : 1,
        fontFamily: 'inherit',
        transition: 'all 0.2s',
      }}
    >
      {status === 'sending' ? '…'
        : status === 'accepted' ? '✓ Enriching'
        : status === 'skipped' ? '⏭ Skipped'
        : status === 'error' ? '✗ Error'
        : 'Re-enrich'}
    </button>
  )
}
