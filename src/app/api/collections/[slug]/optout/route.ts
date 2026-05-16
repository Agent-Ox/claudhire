/**
 * POST /api/collections/[slug]/optout — dashboard-driven opt-out.
 *
 * Requires Supabase session. Sets opted_out_at on the active row
 * (preserves history; never deletes). Idempotent.
 *
 * Does NOT re-check collection-active or profile-published: a builder
 * must always be able to withdraw consent, even if the collection has
 * been deactivated or their profile has been unpublished in the
 * meantime. Opt-out is unconditional.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { optOut } from '@/lib/collections/consent'

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
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 404 })

  await optOut(admin, profile.id as string, slug)
  return NextResponse.json({ success: true, slug })
}
