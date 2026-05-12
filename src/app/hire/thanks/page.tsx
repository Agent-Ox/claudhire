import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Got it — talk soon | ShipStacked',
  description: 'Your hire intake was received. Thomas will respond within 24 hours.',
  alternates: { canonical: 'https://shipstacked.com/hire/thanks' },
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
  check: {
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

export default function HireThanksPage() {
  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.check} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={s.h1}>Got it. Talk soon.</h1>

        <p style={s.p}>
          I read every one of these myself, usually within a few hours of when it comes in. You&apos;ll hear back from me within 24 hours.
        </p>

        <p style={s.intro}>When I reply, you&apos;ll get three things:</p>
        <ol style={s.list}>
          <li style={s.listItem}>
            <span style={s.listNum}>(1)</span>
            <span>What I think you&apos;re actually hiring for — often different from the role you&apos;d post.</span>
          </li>
          <li style={s.listItem}>
            <span style={s.listNum}>(2)</span>
            <span>Two or three specific humans I&apos;d put in front of you for this.</span>
          </li>
          <li style={s.listItem}>
            <span style={s.listNum}>(3)</span>
            <span>What it would cost and how I&apos;d run the engagement.</span>
          </li>
        </ol>

        <p style={s.p}>
          If I think you don&apos;t need me for this, I&apos;ll tell you that too and point you somewhere useful.
        </p>

        <p style={s.signoff}>— Thomas</p>

        <hr style={s.hr} />

        <p style={s.waitLabel}>While you wait —</p>
        <Link href="/atlas" style={s.waitLink}>Read the Atlas →</Link>
      </div>
    </main>
  )
}
