'use client'

// Client analytics helpers for the (server-rendered) profile page.
import { useEffect } from 'react'
import posthog from 'posthog-js'

export function ProfileViewTracker({ username }: { username: string }) {
  useEffect(() => {
    posthog.capture('profile_viewed', { username })
  }, [username])
  return null
}

export function MessageButton({ profileId, username, label }: { profileId: string; username: string; label: string }) {
  return (
    <a
      href={`/messages?as=hirer&new=${profileId}`}
      onClick={() => posthog.capture('message_button_clicked', { username, source: 'profile' })}
      style={{ display: 'inline-block', padding: '0.7rem 1.5rem', background: 'var(--accent)', color: 'white', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
    >
      {label}
    </a>
  )
}
