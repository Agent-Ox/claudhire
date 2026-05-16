/**
 * POST /api/collections/[slug]/optin — dashboard-driven opt-in.
 *
 * Requires Supabase session (the builder themselves). Re-checks BOTH
 * gates server-side: profile.published === true AND collections.active
 * === true. Writes a collection_memberships row with source = 'dashboard'.
 *
 * Idempotent: re-posting when already opted in returns the existing row.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { optIn } from '@/lib/collections/consent'
import { CollectionGateError } from '@/lib/collections/context'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = adminClient()
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, published')
    .eq('email', user.email)
    .maybeSingle()
  if (pErr) return NextResponse.json({ error: 'profile_lookup_failed', message: pErr.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 404 })

  try {
    const membership = await optIn(admin, profile.id as string, slug, 'dashboard')
    return NextResponse.json({ success: true, slug, opted_in_at: membership.opted_in_at })
  } catch (e) {
    if (e instanceof CollectionGateError) {
      const status = e.code === 'unknown_slug' || e.code === 'inactive' ? 404 : 403
      return NextResponse.json({ error: e.code, message: e.message }, { status })
    }
    throw e
  }
}
