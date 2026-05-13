import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "You're in the Atlas | ShipStacked",
  description: "Your role claim was received. Thomas will review your proof of work and reach out if there's fit.",
  alternates: { canonical: 'https://shipstacked.com/claim/thanks' },
  robots: { index: false, follow: true },
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#fbfbfd',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.25rem',
  } as React.CSSProperties,
  card: {
    width: '100%',
    maxWidth: 560,
    background: '#ffffff',
    border: '0.5px solid #e8e8ed',
    borderRadius: 18,
    padding: '3.5rem 2rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  } as React.CSSProperties,
  icon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#e8f1fd',
    color: '#0071e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.75rem',
  } as React.CSSProperties,
  h1: {
    fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#1d1d1f',
    lineHeight: 1.1,
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  p: {
    fontSize: 15,
    color: '#3d3d3f',
    lineHeight: 1.75,
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  intro: {
    fontSize: 15,
    color: '#3d3d3f',
    lineHeight: 1.75,
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem',
  } as React.CSSProperties,
  listItem: {
    display: 'flex',
    gap: '0.75rem',
    fontSize: 15,
    color: '#3d3d3f',
    lineHeight: 1.7,
    marginBottom: '0.625rem',
  } as React.CSSProperties,
  listNum: {
    flexShrink: 0,
    color: '#0071e3',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '1.5rem',
  } as React.CSSProperties,
  signoff: {
    fontSize: 15,
    color: '#1d1d1f',
    fontWeight: 500,
    marginTop: '1.5rem',
    marginBottom: 0,
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: '0.5px solid #e8e8ed',
    margin: '2.5rem 0 1.5rem',
  } as React.CSSProperties,
  waitLabel: {
    fontSize: 13,
    color: '#6e6e73',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  waitLink: {
    fontSize: 15,
    color: '#0071e3',
    textDecoration: 'none',
    fontWeight: 500,
    display: 'inline-block',
  } as React.CSSProperties,
}

export default function ClaimThanksPage() {
  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.icon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="12,6 14.5,12 12,18 9.5,12" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <h1 style={s.h1}>You&apos;re in the Atlas.</h1>

        <p style={s.p}>
          Got your claim. You&apos;re now in the pool of practitioners I route to companies hiring for the role(s) you claimed.
        </p>

        <p style={s.intro}>Here&apos;s what happens next:</p>
        <ol style={s.list}>
          <li style={s.listItem}>
            <span style={s.listNum}>(1)</span>
            <span>I review your proof of work personally — usually within a few days.</span>
          </li>
          <li style={s.listItem}>
            <span style={s.listNum}>(2)</span>
            <span>If something fits what I&apos;m currently routing for, you&apos;ll hear from me sooner than that.</span>
          </li>
          <li style={s.listItem}>
            <span style={s.listNum}>(3)</span>
            <span>If I&apos;d like a 30-min call to learn more about your work, I&apos;ll reach out to schedule one. The bar is real — not every claim becomes routable.</span>
          </li>
        </ol>

        <p style={s.p}>
          No exclusivity. No obligation. You can ask to be removed at any time by emailing{' '}
          <a href="mailto:hello@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>
            hello@shipstacked.com
          </a>.
        </p>

        <p style={s.signoff}>— Thomas</p>

        <hr style={s.hr} />

        <p style={s.waitLabel}>While you wait —</p>
        <Link href="/atlas" style={s.waitLink}>Read the Atlas →</Link>
      </div>
    </main>
  )
}
