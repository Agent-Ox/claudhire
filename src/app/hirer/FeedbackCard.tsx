'use client'

import { useState } from 'react'
import posthog from 'posthog-js'

// In-dashboard feedback widget. Auto-sends the logged-in hirer's email (passed
// as a prop, never shown in the form) so the operator knows who reported what.
export default function FeedbackCard({ email }: { email: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = message.trim()
    if (!trimmed) { setError('Please enter a message.'); return }
    if (trimmed.length > 5000) { setError('Message is too long (5000 characters max).'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, email }),
      })
      if (!res.ok) throw new Error('Failed')
      setSent(true)
      posthog.capture('feedback_submitted')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ borderTop: '0.5px solid #e0e0e5', paddingTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.01em' }}>Found a bug or got an idea?</h2>
      <div style={{ background: 'white', border: '1px solid #e0e0e5', borderRadius: 12, padding: '1.5rem' }}>
        {sent ? (
          <p style={{ fontSize: 14, color: '#1a7f37', fontWeight: 500, margin: 0 }}>Thanks — we&apos;ll look into it.</p>
        ) : (
          <>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: '1rem' }}>
              We&apos;re listening — tell us what would make ShipStacked more useful.
            </p>
            <textarea
              placeholder="What's missing or broken?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              maxLength={5000}
              style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: 10, border: '1px solid #d2d2d7', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.6rem' }}
            />
            {error && <p style={{ fontSize: 13, color: '#ff3b30', marginBottom: '0.6rem' }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={sending}
              style={{ padding: '0.7rem 1.5rem', background: sending ? '#aeaeb2' : '#0071e3', color: 'white', border: 'none', borderRadius: 980, fontSize: 14, fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer' }}
            >
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
