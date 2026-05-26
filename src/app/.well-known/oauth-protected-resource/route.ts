import { NextResponse } from 'next/server'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://shipstacked.com'

export async function GET() {
  return NextResponse.json({
    resource: `${SITE}/api/v1/`,
    resource_name: 'ShipStacked',
    resource_logo_uri: `${SITE}/icon.png`,
    authorization_servers: [`${SITE}/`],
    scopes_supported: ['builder:rw', 'buyer:rw', 'agent:rw'],
    bearer_methods_supported: ['header'],
  }, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
