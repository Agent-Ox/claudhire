'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const s = {
  shell: {
    position: 'fixed' as const,
    bottom: '1.5rem',
    background: '#ffffff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    borderRadius: 14,
    padding: '1rem 1.25rem',
    zIndex: 50,
    transition: 'opacity 300ms ease, transform 300ms ease',
  } as React.CSSProperties,
  label: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    color: '#3d3d3f',
    marginTop: 0,
    marginBottom: '0.625rem',
    lineHeight: 1.3,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '0.5rem',
  } as React.CSSProperties,
  btnPrimary: {
    flex: 1,
    display: 'inline-block',
    textAlign: 'center' as const,
    padding: '0.5rem 0.875rem',
    background: '#0071e3',
    color: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#0071e3',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  btnOutline: {
    flex: 1,
    display: 'inline-block',
    textAlign: 'center' as const,
    padding: '0.5rem 0.875rem',
    background: '#ffffff',
    color: '#0071e3',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#0071e3',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
}

const RESPONSIVE_CSS = `
@media (max-width: 640px) {
  .atlas-sticky-cta {
    left: 1rem;
    right: 1rem;
  }
}
@media (min-width: 641px) {
  .atlas-sticky-cta {
    right: 1.5rem;
    max-width: 400px;
  }
}
`

export default function StickyAtlasCTA() {
  const [heroPast, setHeroPast] = useState(false)
  const [footerInView, setFooterInView] = useState(false)
  const visible = heroPast && !footerInView

  useEffect(() => {
    const hero = document.getElementById('hero-bottom-sentinel')
    const footer = document.getElementById('footer-top-sentinel')
    if (!hero || !footer) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id === 'hero-bottom-sentinel') {
            setHeroPast(entry.boundingClientRect.top < 0)
          } else if (entry.target.id === 'footer-top-sentinel') {
            setFooterInView(entry.isIntersecting)
          }
        }
      },
      { threshold: 0 }
    )

    observer.observe(hero)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      <aside
        className="atlas-sticky-cta"
        role="complementary"
        aria-label="Page actions"
        aria-hidden={!visible}
        style={{
          ...s.shell,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        <p style={s.label}>Recognized something?</p>
        <div style={s.row}>
          <Link
            href="/hire"
            style={s.btnPrimary}
            tabIndex={visible ? 0 : -1}
          >
            Tell me what&apos;s broken →
          </Link>
          <Link
            href="/claim"
            style={s.btnOutline}
            tabIndex={visible ? 0 : -1}
          >
            Claim your role →
          </Link>
        </div>
      </aside>
    </>
  )
}
