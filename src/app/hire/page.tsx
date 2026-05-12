import type { Metadata } from 'next'
import Link from 'next/link'
import HireIntakeForm from './HireIntakeForm'

const TITLE = "Tell me what's broken | ShipStacked"
const DESCRIPTION =
  "Describe what you're trying to ship or what's broken. You'll get a real diagnosis within 24 hours from Thomas — what you're actually hiring for, who you should meet, and what it would cost."
const CANONICAL = 'https://shipstacked.com/hire'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: CANONICAL,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

const REASSURANCE = [
  'Practitioner-built taxonomy',
  'Real humans, not algorithms',
  'Free until placement',
]

const s = {
  page: {
    minHeight: '100vh',
    background: '#fbfbfd',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1d1d1f',
  } as React.CSSProperties,

  hero: {
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)',
    padding: '6rem 1.5rem 5rem',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  heroInner: {
    maxWidth: 720,
    margin: '0 auto',
  } as React.CSSProperties,
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(0,113,227,0.15)',
    border: '1px solid rgba(0,113,227,0.3)',
    borderRadius: 980,
    padding: '0.3rem 0.875rem',
    marginBottom: '1.75rem',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(125,180,255,0.95)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#0071e3',
    display: 'inline-block',
  } as React.CSSProperties,
  h1: {
    fontSize: 'clamp(2.25rem, 6vw, 4rem)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#f0f0f5',
    lineHeight: 1.05,
    margin: '0 auto 1.25rem',
    maxWidth: 720,
  } as React.CSSProperties,
  heroSub: {
    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
    color: 'rgba(240,240,245,0.6)',
    maxWidth: 580,
    margin: '0 auto 2.5rem',
    lineHeight: 1.7,
    fontWeight: 300,
  } as React.CSSProperties,
  bullets: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: '1.25rem 2rem',
    marginTop: 0,
  } as React.CSSProperties,
  bullet: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: 13,
    color: 'rgba(240,240,245,0.7)',
  } as React.CSSProperties,
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#1a7f37',
    display: 'inline-block',
    flexShrink: 0,
  } as React.CSSProperties,

  formSection: {
    padding: '5rem 1.25rem',
    background: '#fbfbfd',
  } as React.CSSProperties,
  formInner: {
    maxWidth: 640,
    margin: '0 auto',
  } as React.CSSProperties,
  framing: {
    fontSize: 14,
    color: '#6e6e73',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    marginBottom: '2.5rem',
    lineHeight: 1.6,
  } as React.CSSProperties,

  atlasSection: {
    padding: '4rem 1.25rem 6rem',
    background: '#fbfbfd',
    borderTop: '0.5px solid #e8e8ed',
  } as React.CSSProperties,
  atlasInner: {
    maxWidth: 640,
    margin: '0 auto',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  atlasH2: {
    fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#1d1d1f',
    marginBottom: '1rem',
    lineHeight: 1.2,
  } as React.CSSProperties,
  atlasP: {
    fontSize: 15,
    color: '#3d3d3f',
    lineHeight: 1.75,
    marginBottom: '1.75rem',
    maxWidth: 560,
    marginLeft: 'auto',
    marginRight: 'auto',
  } as React.CSSProperties,
  atlasLink: {
    display: 'inline-block',
    padding: '0.875rem 1.75rem',
    background: '#ffffff',
    color: '#0071e3',
    border: '1px solid #0071e3',
    borderRadius: 980,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,
}

export default function HirePage() {
  return (
    <main style={s.page}>
      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowDot} />
            <span>For hiring teams</span>
          </div>
          <h1 style={s.h1}>Tell me what&apos;s broken.</h1>
          <p style={s.heroSub}>
            I read every one of these myself. You&apos;ll get a real diagnosis within 24 hours — what you&apos;re actually hiring for, who you should meet, and what it would cost. Not a directory link. Not a form letter.
          </p>
          <ul style={s.bullets} aria-label="What you get">
            {REASSURANCE.map((b) => (
              <li key={b} style={s.bullet}>
                <span style={s.bulletDot} aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form */}
      <section style={s.formSection}>
        <div style={s.formInner}>
          <p style={s.framing}>
            Five questions. Two minutes. Your reply goes straight to Thomas.
          </p>
          <HireIntakeForm />
        </div>
      </section>

      {/* Atlas preview */}
      <section style={s.atlasSection}>
        <div style={s.atlasInner}>
          <h2 style={s.atlasH2}>Curious what we&apos;re routing for?</h2>
          <p style={s.atlasP}>
            The Atlas is the practitioner-defined taxonomy of the agentic-economy labor market. 28 specialist roles, 5 operator types, the compliance layer, alignment research, vertical specialists. It&apos;s the document underneath everything we route.
          </p>
          <Link href="/atlas" style={s.atlasLink}>
            Read the Atlas →
          </Link>
        </div>
      </section>
    </main>
  )
}
