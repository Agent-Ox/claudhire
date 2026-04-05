import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | ShipStacked',
  description: 'Privacy Policy for ShipStacked — how we collect, use, and protect your data.',
  alternates: { canonical: 'https://shipstacked.com/privacy' },
}

const s = {
  page: { minHeight: '100vh', background: '#fbfbfd', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
  inner: { maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem 6rem' } as React.CSSProperties,
  back: { fontSize: 13, color: '#0071e3', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginBottom: '2.5rem' } as React.CSSProperties,
  eyebrow: { fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' },
  h1: { fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '0.5rem', lineHeight: 1.1 } as React.CSSProperties,
  meta: { fontSize: 14, color: '#6e6e73', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid #e0e0e5' } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em', marginTop: '2.5rem', marginBottom: '0.75rem' } as React.CSSProperties,
  h3: { fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginTop: '1.5rem', marginBottom: '0.5rem' } as React.CSSProperties,
  p: { fontSize: 15, color: '#3d3d3f', lineHeight: 1.75, marginBottom: '1rem' } as React.CSSProperties,
  li: { fontSize: 15, color: '#3d3d3f', lineHeight: 1.75, marginBottom: '0.4rem' } as React.CSSProperties,
  hr: { border: 'none', borderTop: '0.5px solid #e8e8ed', margin: '2rem 0' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, marginBottom: '1rem' },
  th: { textAlign: 'left' as const, padding: '0.6rem 0.875rem', background: '#f5f5f7', color: '#1d1d1f', fontWeight: 600, borderBottom: '1px solid #e0e0e5' },
  td: { padding: '0.6rem 0.875rem', color: '#3d3d3f', borderBottom: '0.5px solid #f0f0f5', verticalAlign: 'top' as const },
  address: { background: '#f5f5f7', borderRadius: 12, padding: '1.25rem 1.5rem', fontSize: 14, color: '#3d3d3f', lineHeight: 1.7, marginTop: '1rem', fontStyle: 'normal' } as React.CSSProperties,
}

export default function PrivacyPage() {
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <Link href="/" style={s.back}>← Back to ShipStacked</Link>

        <p style={s.eyebrow}>Legal</p>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.meta}>ShipStacked · Last updated: 5 April 2026</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>1. Who We Are</h2>
        <p style={s.p}>ShipStacked is operated by ShipStacked, Ronda de Sant Pere 52, 08010 Barcelona, Spain.</p>
        <p style={s.p}>For any privacy-related questions or requests, contact us at <a href="mailto:privacy@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>privacy@shipstacked.com</a>.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>2. What Data We Collect</h2>

        <h3 style={s.h3}>2.1 Data you give us directly</h3>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you create an account:</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>Email address</li>
          <li style={s.li}>Password (stored as a secure hash — we never see your plain-text password)</li>
          <li style={s.li}>Account type (builder or employer)</li>
        </ul>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you build your profile (builders):</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>Full name, role, bio, location, profile photo</li>
          <li style={s.li}>Skills, projects, day rate, availability, timezone, languages</li>
          <li style={s.li}>Links to GitHub, X, LinkedIn, personal website</li>
        </ul>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you build your profile (employers):</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>Company name, about, logo, location, website, industry, team size</li>
        </ul>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you use the platform:</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>Build Feed posts and their content</li>
          <li style={s.li}>Messages sent and received on the platform</li>
          <li style={s.li}>Job listings you create</li>
          <li style={s.li}>Builds you apply to</li>
        </ul>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you connect GitHub:</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>GitHub username and public repository count</li>
          <li style={s.li}>Commit activity (90-day window, includes private repo commit counts via OAuth — no code is accessed)</li>
        </ul>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you pay (employers):</strong></p>
        <p style={s.p}>Payment is processed entirely by Stripe. We receive confirmation of payment and your subscription status. We do not store card numbers or payment details.</p>
        <p style={{ ...s.p, marginBottom: '0.5rem' }}><strong>When you use the Builder API:</strong></p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>API keys you generate (stored as a one-way hash — the raw key is never stored)</li>
          <li style={s.li}>Requests made via your API key (logged for rate limiting and last-used tracking)</li>
        </ul>

        <h3 style={s.h3}>2.2 Data we collect automatically</h3>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>IP address and approximate location</li>
          <li style={s.li}>Browser type and operating system</li>
          <li style={s.li}>Pages visited and time spent on the platform</li>
          <li style={s.li}>Referring URL</li>
        </ul>
        <p style={s.p}>We use this data to operate and improve the platform. We do not sell it.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>3. How We Use Your Data</h2>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Purpose</th>
              <th style={s.th}>Legal basis</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Providing the platform — creating your account, showing your profile, enabling messaging', 'Performance of a contract'],
              ['Processing payments and managing subscriptions', 'Performance of a contract'],
              ['Sending transactional emails (welcome, verification, message notifications)', 'Performance of a contract'],
              ['Auto-verification of builder profiles', 'Performance of a contract'],
              ['Calculating Velocity Scores', 'Performance of a contract'],
              ['Displaying your public profile to employers and visitors', 'Legitimate interests'],
              ['Improving the platform through usage analytics', 'Legitimate interests'],
              ['Complying with legal obligations', 'Legal obligation'],
            ].map(([purpose, basis]) => (
              <tr key={purpose}>
                <td style={s.td}>{purpose}</td>
                <td style={s.td}>{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={s.p}>We do not use your data for advertising. We do not sell your data to third parties. ShipStacked is ad-free.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>4. Who We Share Your Data With</h2>
        <p style={s.p}>We share data only with the service providers necessary to operate the platform:</p>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Provider</th>
              <th style={s.th}>Purpose</th>
              <th style={s.th}>Location</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Supabase', 'Database and file storage', 'EU (AWS eu-west-1)'],
              ['Vercel', 'Hosting and edge functions', 'Global CDN'],
              ['Stripe', 'Payment processing', 'USA (EU Standard Contractual Clauses apply)'],
              ['Resend', 'Transactional email delivery', 'USA (EU Standard Contractual Clauses apply)'],
              ['GitHub', 'OAuth authentication and commit data', 'USA (EU Standard Contractual Clauses apply)'],
            ].map(([provider, purpose, location]) => (
              <tr key={provider}>
                <td style={{ ...s.td, fontWeight: 500 }}>{provider}</td>
                <td style={s.td}>{purpose}</td>
                <td style={s.td}>{location}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={s.p}>We do not share your personal data with any other third parties unless required by law.</p>
        <p style={s.p}><strong>Public profile data:</strong> Builder profiles marked as published are publicly accessible and may be indexed by search engines. This includes your name, role, bio, location, skills, projects, and Build Feed posts. You control this — set your profile to unpublished at any time from your dashboard.</p>
        <p style={s.p}><strong>Employer access:</strong> Paid employers can view your published profile and message you directly. They cannot export or bulk-download your data.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>5. Data Retention</h2>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Data type</th>
              <th style={s.th}>Retention period</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Active account data', 'Retained for as long as your account is active'],
              ['Deleted account data', '30 days after deletion, then permanently deleted'],
              ['Payment records', '7 years (required by EU tax law)'],
              ['Messages', 'Deleted with your account (30-day retention applies)'],
              ['API key hashes', 'Deleted immediately on revocation'],
            ].map(([type, period]) => (
              <tr key={type}>
                <td style={s.td}>{type}</td>
                <td style={s.td}>{period}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={s.p}>When you delete your account, your public profile is removed immediately. All other data is permanently deleted after 30 days. Payment records are retained for 7 years as required by law — this data is held by Stripe.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>6. Your Rights Under GDPR</h2>
        <p style={s.p}>If you are located in the European Economic Area (EEA), you have the following rights:</p>
        <p style={s.p}><strong>Right of access:</strong> You can request a copy of all personal data we hold about you.</p>
        <p style={s.p}><strong>Right to rectification:</strong> You can correct inaccurate data from your dashboard at any time, or by contacting us.</p>
        <p style={s.p}><strong>Right to erasure:</strong> You can delete your account at any time. We will permanently delete your data within 30 days, except where required by law.</p>
        <p style={s.p}><strong>Right to restriction:</strong> You can ask us to restrict processing of your data while a dispute is resolved.</p>
        <p style={s.p}><strong>Right to data portability:</strong> You can request your data in a machine-readable format.</p>
        <p style={s.p}><strong>Right to object:</strong> You can object to processing based on legitimate interests.</p>
        <p style={s.p}><strong>Right to withdraw consent:</strong> Where processing is based on consent, you can withdraw it at any time.</p>
        <p style={s.p}>To exercise any of these rights, email <a href="mailto:privacy@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>privacy@shipstacked.com</a>. We will respond within 30 days. You also have the right to lodge a complaint with the Spanish Data Protection Authority (AEPD) at <a href="https://aepd.es" style={{ color: '#0071e3', textDecoration: 'none' }} target="_blank" rel="noreferrer">aepd.es</a>.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>7. Cookies</h2>
        <p style={s.p}>ShipStacked uses strictly necessary cookies only:</p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}><strong>Session cookie:</strong> Keeps you logged in during your session</li>
          <li style={s.li}><strong>Authentication cookie:</strong> Supabase Auth session token</li>
        </ul>
        <p style={s.p}>We do not use advertising cookies, tracking pixels, or third-party analytics cookies. We do not use Google Analytics. Because we only use strictly necessary cookies, we do not require a cookie consent banner under GDPR.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>8. Data Security</h2>
        <p style={s.p}>We take reasonable technical and organisational measures to protect your data:</p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
          <li style={s.li}>All data in transit is encrypted via HTTPS</li>
          <li style={s.li}>Passwords are hashed using bcrypt (handled by Supabase Auth)</li>
          <li style={s.li}>API keys are stored as one-way SHA-256 hashes — the raw key is never stored</li>
          <li style={s.li}>Database access is restricted to server-side code using service role keys</li>
          <li style={s.li}>Profile photos are stored in Supabase Storage with public read access (intentional — they are profile photos)</li>
        </ul>
        <p style={s.p}>No system is completely secure. If you become aware of a security issue, please contact <a href="mailto:privacy@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>privacy@shipstacked.com</a>.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>9. International Transfers</h2>
        <p style={s.p}>ShipStacked is based in Spain (EU). Some of our service providers process data outside the EEA. Where this occurs, we ensure appropriate safeguards are in place, including EU Standard Contractual Clauses. See Section 4 for details of our providers.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>10. Children</h2>
        <p style={s.p}>ShipStacked is not intended for anyone under 18. We do not knowingly collect data from minors. If you believe a minor has created an account, please contact <a href="mailto:privacy@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>privacy@shipstacked.com</a> and we will delete the account.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>11. Changes to This Policy</h2>
        <p style={s.p}>We may update this policy from time to time. We will notify registered users of material changes by email. The date at the top of this document reflects when it was last updated.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>12. Contact</h2>
        <address style={s.address}>
          <strong>ShipStacked</strong><br />
          Ronda de Sant Pere 52, 08010 Barcelona, Spain<br />
          <a href="mailto:privacy@shipstacked.com" style={{ color: '#0071e3', textDecoration: 'none' }}>privacy@shipstacked.com</a>
          <br /><br />
          For complaints, you may also contact the Spanish Data Protection Authority:<br />
          <strong>Agencia Española de Protección de Datos (AEPD)</strong><br />
          <a href="https://aepd.es" style={{ color: '#0071e3', textDecoration: 'none' }} target="_blank" rel="noreferrer">aepd.es</a>
        </address>

        <p style={{ ...s.p, marginTop: '2.5rem', fontSize: 13, color: '#aeaeb2' }}>
          See also: <Link href="/terms" style={{ color: '#0071e3', textDecoration: 'none' }}>Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
