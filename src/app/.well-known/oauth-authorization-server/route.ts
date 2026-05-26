import { NextResponse } from 'next/server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

export async function GET() {
  return NextResponse.json({
    issuer: SITE,
    authorization_endpoint: `${SITE}/login`,
    token_endpoint: `${SITE}/api/agent/auth/claim/complete`,
    agent_auth: {
      auth_md_uri: `${SITE}/auth.md`,
      flows_supported: ['user_claimed'],
      claim_endpoint: `${SITE}/api/agent/auth/claim`,
      claim_complete_endpoint: `${SITE}/api/agent/auth/claim/complete`,
      scopes_supported: ['builder:rw', 'buyer:rw'],
      claim_token_ttl_seconds: 86400,
      otp_length: 6,
      otp_ttl_seconds: 600,
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
