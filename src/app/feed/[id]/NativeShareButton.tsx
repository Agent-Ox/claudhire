'use client'

import { useState } from 'react'

export default function NativeShareDetailButton({ postId, title, builderName }: { postId: string; title: string; builderName: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://shipstacked.com/feed/${postId}`

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: `${title} — ${builderName}`, text: `Check out this build on ShipStacked: ${title}`, url }) } catch {}
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={handleShare} title="Share"
      style={{ width: 34, height: 34, borderRadius: '50%', background: copied ? '#e3f3e3' : '#f0f0f5', border: '1px solid', borderColor: copied ? '#b3e0b3' : '#e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: copied ? '#1a7f37' : '#6e6e73' }}>
      {copied
        ? <span style={{ fontSize: 12, fontWeight: 700 }}>✓</span>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      }
    </button>
  )
}
