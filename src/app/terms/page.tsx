import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | ShipStacked',
  description: 'Terms of Service for ShipStacked — the proof-of-work hiring platform for AI-native builders.',
  alternates: { canonical: 'https://shipstacked.com/terms' },
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
  hr: { border: 'none', borderTop: '0.5px solid #e8e8ed', margin: '2rem 0' } as React.CSSProperties,
  address: { background: '#f5f5f7', borderRadius: 12, padding: '1.25rem 1.5rem', fontSize: 14, color: '#3d3d3f', lineHeight: 1.7, marginTop: '1rem', fontStyle: 'normal' } as React.CSSProperties,
}

export default function TermsPage() {
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <Link href="/" style={s.back}>← Back to ShipStacked</Link>

        <p style={s.eyebrow}>Legal</p>
        <h1 style={s.h1}>Terms of Service</h1>
        <p style={s.meta}>ShipStacked · Last updated: 5 April 2026</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>1. Introduction</h2>
        <p style={s.p}>These Terms of Service ("Terms") govern your access to and use of ShipStacked, operated by ShipStacked, Ronda de Sant Pere 52, 08010 Barcelona, Spain ("we", "us", "our").</p>
        <p style={s.p}>By creating an account or using the platform at shipstacked.com, you agree to be bound by these Terms. If you do not agree, do not use the platform.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>2. Eligibility</h2>
        <p style={s.p}>You must be at least 18 years old to use ShipStacked. ShipStacked is a professional hiring platform and is not intended for use by minors. By creating an account, you confirm that you meet this requirement.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>3. Account Types</h2>
        <p style={s.p}><strong>Builder accounts</strong> are free. Builders can create a public profile, post to the Build Feed, connect GitHub, use the Builder API, and receive messages from employers.</p>
        <p style={s.p}><strong>Employer accounts</strong> require a paid monthly subscription. Employers can browse the full builder directory, message builders directly, post job listings, and save builders to a shortlist.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>4. Builder Accounts</h2>
        <h3 style={s.h3}>4.1 Your content</h3>
        <p style={s.p}>You are responsible for all content you post, including your profile, project descriptions, Build Feed posts, and links. You confirm that all information you provide is accurate and not misleading, and that your builds and outcomes are genuine. ShipStacked is a proof-of-work platform — fictional or exaggerated claims are a violation of these Terms.</p>
        <h3 style={s.h3}>4.2 Build Feed</h3>
        <p style={s.p}>Build Feed posts are public and indexed by search engines. Do not post confidential client information, personal data of third parties, or content you do not have the right to share.</p>
        <h3 style={s.h3}>4.3 Verification</h3>
        <p style={s.p}>The verified badge is awarded automatically when your profile meets our criteria. We reserve the right to remove verification if we determine that content is false, misleading, or in breach of these Terms.</p>
        <h3 style={s.h3}>4.4 API keys</h3>
        <p style={s.p}>Your API keys are personal to you. You are responsible for keeping them secure. Do not share keys publicly or embed them in client-side code. If a key is compromised, revoke it immediately from your dashboard. You are responsible for all activity made using your keys.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>5. Employer Accounts</h2>
        <h3 style={s.h3}>5.1 Subscription</h3>
        <p style={s.p}>Employer access requires a paid monthly subscription billed in advance. You can cancel at any time. No refunds are provided for partial months. We reserve the right to change pricing with 30 days notice.</p>
        <h3 style={s.h3}>5.2 Use of builder data</h3>
        <p style={s.p}>You may access builder profiles and messaging solely for the purpose of evaluating and hiring builders. You may not scrape or export builder data in bulk, use builder contact details for purposes unrelated to hiring, share builder data with third parties without consent, or send unsolicited commercial messages unrelated to hiring.</p>
        <h3 style={s.h3}>5.3 Job listings</h3>
        <p style={s.p}>Listings must represent genuine open roles or projects. You may not post listings designed to harvest builder information without genuine hiring intent.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>6. Messaging</h2>
        <p style={s.p}>All messages between builders and employers take place on the ShipStacked platform. You agree not to send spam or unsolicited promotions, harass or abuse other users, or share personal contact details for the purpose of circumventing the platform. We reserve the right to remove messages and suspend accounts that violate these rules.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>7. Prohibited Conduct</h2>
        <p style={s.p}>You may not use ShipStacked to post false or fraudulent information, impersonate another person or organisation, violate any applicable law or regulation, interfere with the platform or its infrastructure, attempt to gain unauthorised access to any part of the platform, scrape or harvest data outside the official Builder API, or post content that is defamatory, discriminatory, or otherwise harmful.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>8. Intellectual Property</h2>
        <h3 style={s.h3}>8.1 Your content</h3>
        <p style={s.p}>You retain ownership of content you post. By posting, you grant ShipStacked a non-exclusive, worldwide, royalty-free licence to display and promote your content on the platform and in marketing materials. You can withdraw this licence by deleting your account.</p>
        <h3 style={s.h3}>8.2 Our platform</h3>
        <p style={s.p}>ShipStacked and its design, code, and content (excluding user-generated content) are owned by ShipStacked. You may not reproduce or create derivative works from our platform without written permission.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>9. Payments</h2>
        <p style={s.p}>Subscriptions are processed by Stripe. ShipStacked does not store payment card details. By subscribing you agree to Stripe's terms of service.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>10. Termination</h2>
        <h3 style={s.h3}>10.1 By you</h3>
        <p style={s.p}>You can delete your account at any time from your dashboard or by emailing privacy@shipstacked.com. Your public profile is removed immediately. Your data is retained for 30 days before permanent deletion.</p>
        <h3 style={s.h3}>10.2 By us</h3>
        <p style={s.p}>We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. Paid employer accounts suspended for Terms violations are not entitled to a refund.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>11. Disclaimers</h2>
        <p style={s.p}>ShipStacked is provided "as is" without warranties of any kind. We do not guarantee the accuracy of builder profiles, the outcome of any hiring process, or uninterrupted access to the platform. We are not a party to any agreement between builders and employers and accept no liability for the outcome of any hire.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>12. Limitation of Liability</h2>
        <p style={s.p}>To the maximum extent permitted by law, ShipStacked's total liability to you for any claim arising from your use of the platform shall not exceed the amount you paid to ShipStacked in the 12 months preceding the claim, or €100, whichever is greater.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>13. Governing Law</h2>
        <p style={s.p}>These Terms are governed by the laws of Spain. Any disputes shall be subject to the exclusive jurisdiction of the courts of Barcelona, Spain, except where mandatory consumer protection laws in your country of residence provide otherwise.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>14. Changes to These Terms</h2>
        <p style={s.p}>We may update these Terms from time to time. We will notify registered users of material changes by email. Continued use of the platform after changes take effect constitutes acceptance of the new Terms.</p>

        <hr style={s.hr} />

        <h2 style={s.h2}>15. Contact</h2>
        <address style={s.address}>
          <strong>ShipStacked</strong><br />
          Ronda de Sant Pere 52, 08010 Barcelona, Spain<br />
          hello@shipstacked.com
        </address>

        <p style={{ ...s.p, marginTop: '2.5rem', fontSize: 13, color: '#aeaeb2' }}>
          See also: <Link href="/privacy" style={{ color: '#0071e3', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
