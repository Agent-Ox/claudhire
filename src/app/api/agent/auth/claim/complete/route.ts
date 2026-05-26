import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { findOrCreateHumanEntity } from '@/lib/entities'

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function generateApiKey(): string {
  const bytes = randomBytes(24).toString('base64url').replace(/[-_]/g, '')
  return `sk_ss_${bytes.slice(0, 32)}`
}

export async function POST(req: Request) {
  let body: { claim_token?: string; otp_code?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const claimToken = body.claim_token?.trim()
  const otpCode = body.otp_code?.trim()
  if (!claimToken || !otpCode) return NextResponse.json({ error: 'claim_token and otp_code required' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const claimTokenHash = sha256(claimToken)
  const otpHash = sha256(otpCode)

  const { data: reg } = await admin
    .from('agent_registrations')
    .select('*')
    .eq('claim_token_hash', claimTokenHash)
    .eq('status', 'pending')
    .maybeSingle()
  if (!reg) return NextResponse.json({ error: 'Invalid or used claim token' }, { status: 404 })

  if (new Date(reg.expires_at) < new Date()) {
    await admin.from('agent_registrations').update({ status: 'expired' }).eq('id', reg.id)
    return NextResponse.json({ error: 'Claim token expired' }, { status: 410 })
  }
  if (reg.otp_attempts >= 5) {
    await admin.from('agent_registrations').update({ status: 'failed' }).eq('id', reg.id)
    return NextResponse.json({ error: 'Too many OTP attempts. Restart the claim flow.' }, { status: 410 })
  }
  if (reg.otp_code_hash !== otpHash) {
    await admin.from('agent_registrations').update({ otp_attempts: reg.otp_attempts + 1 }).eq('id', reg.id)
    return NextResponse.json({ error: 'OTP code incorrect' }, { status: 401 })
  }

  // OTP correct. Mint or look up auth user, entity, profile.
  const { data: userByEmail } = await admin.auth.admin.listUsers()
  let authUser = userByEmail?.users.find(u => u.email === reg.email)
  if (!authUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: reg.email,
      email_confirm: true,
      user_metadata: { created_via: 'agent_registration', agent_provider: reg.agent_provider },
    })
    if (createErr || !created.user) {
      return NextResponse.json({ error: `Auth user creation failed: ${createErr?.message}` }, { status: 500 })
    }
    authUser = created.user
  }

  try {
    await findOrCreateHumanEntity(admin, authUser)
  } catch (err) {
    return NextResponse.json({ error: 'Entity creation failed' }, { status: 500 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profile row missing post-entity-create' }, { status: 500 })
  }

  const rawKey = generateApiKey()
  const keyHash = sha256(rawKey)
  const keyPrefix = rawKey.slice(0, 11)  // 'sk_ss_' + 5 chars — matches existing key_prefix convention

  // NOTE: api_keys real columns are id, profile_id, key_hash, key_prefix, name, email, last_used_at, created_at, scope (post-§D)
  const { data: keyRow, error: keyErr } = await admin
    .from('api_keys')
    .insert({
      profile_id: profile.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: reg.agent_name ?? 'Agent-registered key',
      email: reg.email,
      scope: reg.requested_scope,
    })
    .select('id')
    .single()
  if (keyErr || !keyRow) {
    return NextResponse.json({ error: `API key insert failed: ${keyErr?.message}` }, { status: 500 })
  }

  await admin
    .from('agent_registrations')
    .update({ status: 'completed', api_key_id: keyRow.id, completed_at: new Date().toISOString() })
    .eq('id', reg.id)

  return NextResponse.json({
    api_key: rawKey,
    scope: reg.requested_scope,
    key_id: keyRow.id,
    key_prefix: keyPrefix,
    expires_at: null,
  })
}
