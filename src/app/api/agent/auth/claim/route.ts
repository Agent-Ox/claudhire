import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { Resend } from 'resend'

const SCOPES_ALLOWED = ['builder:rw', 'buyer:rw'] as const

function generateClaimToken(): string {
  const bytes = randomBytes(20)
  const base62 = bytes.toString('base64url').replace(/[-_]/g, '').slice(0, 25)
  return `clm_${base62}`
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

export async function POST(req: Request) {
  let body: { email?: string; scope?: string; agent_provider?: string; agent_name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const email = body.email?.trim().toLowerCase()
  const scope = body.scope?.trim()
  if (!email || !scope) return NextResponse.json({ error: 'email and scope required' }, { status: 400 })
  if (!SCOPES_ALLOWED.includes(scope as any)) {
    return NextResponse.json({ error: `Invalid scope. Allowed: ${SCOPES_ALLOWED.join(', ')}` }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentClaims } = await admin
    .from('agent_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo)
  if ((recentClaims ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many recent claim attempts. Try again in an hour.' }, { status: 429 })
  }

  const claimToken = generateClaimToken()
  const otp = generateOtp()
  const claimTokenHash = sha256(claimToken)
  const otpHash = sha256(otp)

  const { data: row, error } = await admin
    .from('agent_registrations')
    .insert({
      claim_token_hash: claimTokenHash,
      email,
      requested_scope: scope,
      agent_provider: body.agent_provider ?? null,
      agent_name: body.agent_name ?? null,
      otp_code_hash: otpHash,
      otp_sent_at: new Date().toISOString(),
      status: 'pending',
    })
    .select('expires_at')
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Registration insert failed' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'ShipStacked <noreply@shipstacked.com>',
    to: email,
    subject: `Agent registration code: ${otp}`,
    html: `
      <p>An AI agent has requested access to ShipStacked on your behalf.</p>
      <p><strong>Agent provider:</strong> ${body.agent_provider ?? 'unknown'}</p>
      <p><strong>Agent name:</strong> ${body.agent_name ?? 'unknown'}</p>
      <p><strong>Requested scope:</strong> ${scope}</p>
      <p>Your confirmation code is: <strong>${otp}</strong></p>
      <p>This code expires in 10 minutes. Share it only with the agent that initiated this request.</p>
      <p>If you did not initiate this, ignore this email — no account changes will be made.</p>
    `,
  })

  return NextResponse.json({
    claim_token: claimToken,
    expires_at: row.expires_at,
    otp_sent_to_email: true,
    next_endpoint: '/api/agent/auth/claim/complete',
  })
}
