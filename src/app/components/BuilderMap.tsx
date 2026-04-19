'use client'

import { useEffect, useState } from 'react'

// Simplified world landmasses as SVG paths (equirectangular projection)
// Keeps file size tiny — no external topojson dependency
const WORLD_PATH = "M 158 140 Q 155 135 160 130 L 175 125 L 195 127 L 210 130 L 225 135 L 240 140 L 255 145 L 270 148 L 285 150 L 300 152 L 315 150 L 330 148 L 345 145 L 360 142 L 375 140 L 390 138 L 405 140 L 420 145 L 435 150 L 450 155 L 465 158 L 480 160 L 495 162 L 510 165 L 525 170 L 540 175 L 555 180 L 570 185 L 585 188 L 600 190 L 615 188 L 630 185 L 645 180 L 660 175 L 675 170 L 690 168 L 705 170 L 720 175 L 735 180 L 750 185 L 765 190 L 780 195 L 795 200 L 810 205 L 825 210 L 840 215 L 855 220 L 870 225 L 885 230 L 900 235 Z"

// Use a well-known, minimal world map path set. We'll render a stylised blob world.
// Actually, let's use a cleaner approach — render continents as simplified shapes.

interface Country {
  code: string
  name: string
  count: number
  lng: number
  lat: number
}

interface GeoData {
  countries: Country[]
  totalBuilders: number
  unspecified: number
  countryCount: number
}

// Convert lng/lat to SVG x/y (equirectangular, viewBox 0 0 1000 500)
function project(lng: number, lat: number): [number, number] {
  const x = (lng + 180) * (1000 / 360)
  const y = (90 - lat) * (500 / 180)
  return [x, y]
}

export default function BuilderMap() {
  const [data, setData] = useState<GeoData | null>(null)
  const [hovered, setHovered] = useState<Country | null>(null)

  useEffect(() => {
    fetch('/api/builders/geo')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data || data.countries.length === 0) return null

  const continents = new Set(
    data.countries.map(c => {
      // Rough continent mapping
      const eu = ['GB','ES','DE','FR','IT','NL','DK','SE','NO','FI','IS','PT','IE','CH','AT','BE','PL','CZ','RO','GR','UA']
      const na = ['US','CA','MX']
      const sa = ['BR','AR','CL','CO','PE','UY']
      const as = ['CN','JP','KR','IN','PK','BD','LK','ID','SG','MY','TH','VN','PH','TW','IL','AE','SA','TR']
      const af = ['NG','KE','ZA','EG','MA','GH','ET','TN','DZ','RW','UG']
      const oc = ['AU','NZ']
      if (eu.includes(c.code)) return 'EU'
      if (na.includes(c.code)) return 'NA'
      if (sa.includes(c.code)) return 'SA'
      if (as.includes(c.code)) return 'AS'
      if (af.includes(c.code)) return 'AF'
      if (oc.includes(c.code)) return 'OC'
      return 'OTHER'
    })
  )

  const maxCount = Math.max(...data.countries.map(c => c.count))

  return (
    <section style={{ background: '#0a0a0f', padding: '5rem 1.5rem', color: '#f0f0f5' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0071e3', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Global
        </p>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.75rem', lineHeight: 1.15 }}>
          Where the world&apos;s AI-native builders ship from.
        </h2>
        <p style={{ fontSize: '1rem', color: '#a8a8b0', fontWeight: 300, lineHeight: 1.6, marginBottom: '3rem', maxWidth: 560, margin: '0 auto 3rem' }}>
          {data.countryCount} {data.countryCount === 1 ? 'country' : 'countries'} · {continents.size} {continents.size === 1 ? 'continent' : 'continents'} · {data.totalBuilders} builders shipping in real time
        </p>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1', maxWidth: 1000, margin: '0 auto' }}>
          <svg viewBox="0 0 1000 500" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
            {/* Subtle grid background */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a1a22" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1000" height="500" fill="url(#grid)" />

            {/* Simplified continent shapes — abstract but recognisable */}
            <g fill="#1e1e28" stroke="#2a2a36" strokeWidth="0.5">
              {/* North America */}
              <path d="M 120 120 Q 100 100 130 90 L 180 80 L 230 85 L 270 100 L 280 130 L 260 160 L 240 190 L 210 210 L 180 220 L 150 210 L 130 180 L 115 150 Z" />
              {/* South America */}
              <path d="M 260 260 L 290 250 L 320 270 L 325 310 L 315 350 L 300 385 L 280 410 L 265 400 L 255 370 L 255 330 Z" />
              {/* Europe */}
              <path d="M 460 120 L 500 110 L 540 115 L 555 135 L 545 155 L 520 165 L 490 170 L 470 160 L 455 145 Z" />
              {/* Africa */}
              <path d="M 490 185 L 540 180 L 580 200 L 595 240 L 590 290 L 570 330 L 540 355 L 515 345 L 495 310 L 485 265 L 482 220 Z" />
              {/* Asia */}
              <path d="M 560 110 L 640 100 L 720 105 L 790 120 L 830 150 L 840 190 L 815 220 L 770 225 L 720 215 L 680 205 L 640 195 L 600 180 L 575 160 L 560 135 Z" />
              {/* India subcontinent */}
              <path d="M 670 210 L 700 215 L 715 235 L 710 265 L 695 280 L 680 275 L 670 250 L 668 225 Z" />
              {/* Southeast Asia / Indonesia */}
              <path d="M 780 245 L 820 250 L 850 265 L 840 285 L 800 290 L 770 280 L 765 260 Z" />
              {/* Australia */}
              <path d="M 820 340 L 880 335 L 910 355 L 905 385 L 870 395 L 835 390 L 820 370 Z" />
              {/* UK / Ireland */}
              <path d="M 448 130 L 460 125 L 465 140 L 455 150 L 445 145 Z" />
              {/* Japan */}
              <path d="M 845 165 L 855 160 L 862 175 L 855 185 L 848 180 Z" />
            </g>

            {/* Builder dots */}
            {data.countries.map(country => {
              const [x, y] = project(country.lng, country.lat)
              const ratio = country.count / maxCount
              const radius = 4 + ratio * 8
              const pulses = country.count >= 3
              return (
                <g key={country.code}>
                  {/* Glow */}
                  <circle cx={x} cy={y} r={radius * 3} fill="url(#dotGlow)" style={{ pointerEvents: 'none' }} />
                  {/* Pulse animation for busy countries */}
                  {pulses && (
                    <circle cx={x} cy={y} r={radius} fill="none" stroke="#0071e3" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" from={radius} to={radius * 2.5} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="#0071e3"
                    stroke="#ffffff"
                    strokeWidth="1"
                    style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 4px rgba(0,113,227,0.8))' }}
                    onMouseEnter={() => setHovered(country)}
                    onMouseLeave={() => setHovered(null)}
                  />
                </g>
              )
            })}
          </svg>

          {/* Hover tooltip */}
          {hovered && (
            <div style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ffffff',
              color: '#0a0a0f',
              padding: '0.6rem 1rem',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              {hovered.name} · {hovered.count} {hovered.count === 1 ? 'builder' : 'builders'}
            </div>
          )}
        </div>

        {data.unspecified > 0 && (
          <p style={{ fontSize: 12, color: '#6e6e7a', marginTop: '2rem', fontWeight: 300 }}>
            + {data.unspecified} {data.unspecified === 1 ? 'builder' : 'builders'} with unspecified location
          </p>
        )}
      </div>
    </section>
  )
}
