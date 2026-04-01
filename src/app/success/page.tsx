import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function getSessionData(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const email = session.customer_email || session.customer_details?.email || null
    const product = (session.metadata?.product as string) || 'unknown'
    return { email, product }
  } catch {
    return { email: null, product: 'unknown' }
  }
}

async function getMagicLink(sessionId: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('subscriptions')
      .select('magic_link')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()
    return data?.magic_link || null
  } catch {
    return null
  }
}

const productLabels: Record<string, string> = {
  full_access: 'Full Access subscription',
  job_post: 'Job Post',
  concierge: 'Concierge matching',
}

const containerStyle = {
  minHeight: '100vh',
  background: '#fbfbfd',
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const innerStyle = {
  maxWidth: 480,
  padding: '2rem',
  textAlign: 'center' as const,
}

const iconStyle = {
  width: 72,
  height: 72,
  background: '#e3f3e3',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1.5rem',
  fontSize: 32,
  color: '#1a7f37',
}

const headingStyle = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: '-0.03em',
  marginBottom: '0.75rem',
  color: '#1d1d1f',
}

const btnStyle = {
  display: 'inline-block',
  padding: '1rem 2.5rem',
  background: '#0071e3',
  color: 'white',
  borderRadius: 980,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: 'none',
  letterSpacing: '-0.01em',
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) {
    return (
      <div style={containerStyle}>
        <div style={innerStyle}>
          <h1 style={headingStyle}>Something went wrong.</h1>
          <p style={{ color: '#6e6e73', marginTop: '1rem' }}>
            Please contact <a href="mailto:hello@claudhire.com" style={{ color: '#0071e3' }}>hello@claudhire.com</a>
          </p>
        </div>
      </div>
    )
  }

  const { email, product } = await getSessionData(session_id)

  let magicLink: string | null = null
  for (let i = 0; i < 5; i++) {
    magicLink = await getMagicLink(session_id)
    if (magicLink) break
    await new Promise(r => setTimeout(r, 1000))
  }

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <div style={iconStyle}>✓</div>
        <h1 style={headingStyle}>Welcome to ClaudHire.</h1>
        <p style={{ color: '#6e6e73', fontSize: 15, marginBottom: '0.5rem', lineHeight: 1.6 }}>
          Your {productLabels[product] || 'purchase'} is confirmed.
        </p>
        {email && (
          <p style={{ color: '#aeaeb2', fontSize: 13, marginBottom: '2rem' }}>{email}</p>
        )}
        {magicLink ? (
          <div>
            <a href={magicLink} style={btnStyle}>Access ClaudHire</a>
            <p style={{ color: '#aeaeb2', fontSize: 12, marginTop: '1rem' }}>
              One click and you are in. No password needed right now.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#6e6e73', fontSize: 14, marginBottom: '1.5rem' }}>
              We are setting up your account. This takes just a moment.
            </p>
            <a href="/login" style={btnStyle}>Continue to sign in</a>
          </div>
        )}
        <p style={{ color: '#6e6e73', fontSize: 13, marginTop: '2rem' }}>
          Questions? <a href="mailto:hello@claudhire.com" style={{ color: '#0071e3', textDecoration: 'none' }}>hello@claudhire.com</a>
        </p>
      </div>
    </div>
  )
}
