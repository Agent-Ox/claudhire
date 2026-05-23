import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateBuyerEntity } from '@/lib/entities'

// POST — set up the buyer-only entity for the authenticated user (Card 4 of
// /join router).
//
// Batch 4 D1=(b): no Stripe touch at signup. The paywall fires at first
// paid action (post-job, message builder) via existing /api/checkout. Card
// 4 signup just creates the entity + sets user_metadata.role='client'.
//
// Result: entities row with kind='human' (buyer is a person who hires),
// user_metadata.role='client' for routing/badge purposes. No profile, no
// subscription.
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Stamp user_metadata.role='client' (idempotent — preserves any other
    // metadata fields like full_name/password_set).
    const currentMeta = (user.user_metadata as Record<string, unknown>) || {}
    if (currentMeta.role !== 'client') {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...currentMeta, role: 'client' },
      })
    }

    const { entity, was_created } = await findOrCreateBuyerEntity(admin, user)
    return NextResponse.json({
      entity_id: entity.id,
      external_id: entity.external_id,
      slug: entity.slug,
      display_name: entity.display_name,
      was_created,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Buyer signup failed' }, { status: 500 })
  }
}
