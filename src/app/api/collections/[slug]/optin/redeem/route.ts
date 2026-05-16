/**
 * POST /api/collections/[slug]/optin/redeem — token-driven opt-in.
 *
 * Body: { token: string }
 *
 * The token IS the auth (no Supabase session required). Single-purpose
 * by construction: the token can only opt in the specific profile it
 * was minted for, into the specific collection it was minted for. The
 * route verifies (a) the slug in the URL matches the slug in the
 * token's row, (b) all four gates pass before consenting.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { optIn } from '@/lib/collections/consent'
import { redeemAndConsume } from '@/lib/collections/tokens'
import { CollectionGateError } from '@/lib/collections/context'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  let body: { token?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const token = typeof body.token === 'string' ? body.token : null
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const admin = adminClient()

  // 1. Redeem the token (atomic mark-used).
  const redemption = await redeemAndConsume(admin, token)
  if (!redemption.ok) {
    return NextResponse.json({ error: redemption.reason }, { status: 400 })
  }

  // 2. Verify the URL slug matches the token's slug (defence — protects
  //    against a token being submitted to a different collection's route).
  if (redemption.collection_slug !== slug) {
    return NextResponse.json({ error: 'slug_mismatch' }, { status: 400 })
  }

  // 3. Now call optIn — which re-checks profile.published + collection.active.
  //    If this fails, the token is already marked used; that's acceptable
  //    (a no-longer-eligible profile can't re-redeem the same token).
  try {
    const membership = await optIn(
      admin,
      redemption.profile_id,
      slug,
      'link',
      { token_id: token },
    )
    return NextResponse.json({ success: true, slug, opted_in_at: membership.opted_in_at })
  } catch (e) {
    if (e instanceof CollectionGateError) {
      const status = e.code === 'unknown_slug' || e.code === 'inactive' ? 404 : 403
      return NextResponse.json({ error: e.code, message: e.message }, { status })
    }
    throw e
  }
}
